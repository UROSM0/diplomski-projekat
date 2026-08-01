import { AIChatResponseDTO } from "../Domain/DTOs/AIChatResponseDTO";
import { AISourceDTO } from "../Domain/DTOs/AISourceDTO";
import { KnowledgeArticle } from "../Domain/models/KnowledgeArticle";
import { IAISupportService } from "../Domain/services/IAISupportService";
import { IKnowledgeService } from "../Domain/services/IKnowledgeService";
import articlesData from "../Knowledge/articles.json";

type IndexedArticle = KnowledgeArticle & { embedding: number[] };
type SearchResult = { article: IndexedArticle; score: number };

export class KnowledgeService implements IKnowledgeService {
  private readonly articles = articlesData as KnowledgeArticle[];
  private readonly topResults = this.toPositiveInteger(process.env.AI_RAG_TOP_K, 4);
  private readonly scoreWindow = this.toScoreWindow(process.env.AI_RAG_SCORE_WINDOW, 0.08);
  private readonly indexPath = path.resolve(
    process.env.AI_KNOWLEDGE_INDEX_PATH ?? path.join(process.cwd(), "data", "knowledge-index.json")
  );
  private indexedArticles: IndexedArticle[] = [];
  private indexingPromise?: Promise<void>;

  constructor(private readonly aiSupportService: IAISupportService) {}

  getArticleCount(): number {
    return this.articles.length;
  }

  isIndexed(): boolean {
    return this.indexedArticles.length === this.articles.length;
  }

  getStatus(): { articleCount: number; indexedArticleCount: number; topResults: number } {
    return {
      articleCount: this.articles.length,
      indexedArticleCount: this.indexedArticles.length,
      topResults: this.topResults,
    };
  }

  async ask(questionValue: string): Promise<AIChatResponseDTO> {
    const question = questionValue?.trim();
    if (!question) throw new Error("Question is required.");

    await this.ensureIndexed();
    const [queryEmbedding] = await this.aiSupportService.createEmbeddings([
      `search_query: ${question}`,
    ]);
    const rankedResults = this.indexedArticles
      .map<SearchResult>((article) => ({ article, score: this.cosineSimilarity(queryEmbedding, article.embedding) }))
      .sort((first, second) => second.score - first.score)
      .slice(0, this.topResults);
    const bestScore = rankedResults[0]?.score ?? 0;
    const results = rankedResults.filter((result) => result.score >= bestScore - this.scoreWindow);

    const response = await this.aiSupportService.chat({
      question,
      context: results.map(
        ({ article }) => `[IZVOR: ${article.title}]\n${article.content}`
      ),
    });

    const insufficientInformation = response.answer
      .toLocaleLowerCase("sr-Latn")
      .includes("nemam dovoljno informacija");

    return {
      ...response,
      sources: insufficientInformation
        ? []
        : results.map<AISourceDTO>(({ article, score }) => ({
            id: article.id,
            title: article.title,
            source: article.source,
            relevance: Number(score.toFixed(4)),
          })),
    };
  }

  async askStream(questionValue: string, onToken: (token: string) => void): Promise<{ model: string; sources: AISourceDTO[] }> {
    const question = questionValue?.trim();
    if (!question) throw new Error("Question is required.");
    const results = await this.search(question);
    const response = await this.aiSupportService.streamChat({
      question,
      context: results.map(({ article }) => `[IZVOR: ${article.title}]\n${article.content}`),
    }, onToken);
    return {
      model: response.model,
      sources: results.map(({ article, score }) => ({
        id: article.id,
        title: article.title,
        source: article.source,
        relevance: Number(score.toFixed(4)),
      })),
    };
  }

  private async search(question: string): Promise<SearchResult[]> {
    await this.ensureIndexed();
    const [queryEmbedding] = await this.aiSupportService.createEmbeddings([`search_query: ${question}`]);
    const rankedResults = this.indexedArticles
      .map<SearchResult>((article) => ({ article, score: this.cosineSimilarity(queryEmbedding, article.embedding) }))
      .sort((first, second) => second.score - first.score)
      .slice(0, this.topResults);
    const bestScore = rankedResults[0]?.score ?? 0;
    return rankedResults.filter((result) => result.score >= bestScore - this.scoreWindow);
  }

  private async ensureIndexed(): Promise<void> {
    if (this.isIndexed()) return;
    if (!this.indexingPromise) {
      this.indexingPromise = this.loadOrBuildIndex().finally(() => {
        this.indexingPromise = undefined;
      });
    }
    await this.indexingPromise;
  }

  private async loadOrBuildIndex(): Promise<void> {
    const sourceHash = this.getSourceHash();
    try {
      const cached = JSON.parse(await readFile(this.indexPath, "utf8")) as {
        sourceHash?: string;
        articles?: IndexedArticle[];
      };
      if (
        cached.sourceHash === sourceHash &&
        cached.articles?.length === this.articles.length &&
        cached.articles.every((article) => article.embedding?.length)
      ) {
        this.indexedArticles = cached.articles;
        return;
      }
    } catch {
      // Cache does not exist or is invalid. A fresh index is built below.
    }

    await this.buildIndex();
    await mkdir(path.dirname(this.indexPath), { recursive: true });
    await writeFile(
      this.indexPath,
      JSON.stringify({ sourceHash, articles: this.indexedArticles }),
      "utf8"
    );
  }

  private async buildIndex(): Promise<void> {
    const inputs = this.articles.map(
      (article) => `search_document: ${article.title}\n${article.tags.join(", ")}\n${article.content}`
    );
    const embeddings = await this.aiSupportService.createEmbeddings(inputs);
    this.indexedArticles = this.articles.map((article, index) => ({
      ...article,
      embedding: embeddings[index],
    }));
  }

  private cosineSimilarity(first: number[], second: number[]): number {
    if (first.length !== second.length || !first.length) return 0;
    let dotProduct = 0;
    let firstMagnitude = 0;
    let secondMagnitude = 0;
    for (let index = 0; index < first.length; index += 1) {
      dotProduct += first[index] * second[index];
      firstMagnitude += first[index] ** 2;
      secondMagnitude += second[index] ** 2;
    }
    const denominator = Math.sqrt(firstMagnitude) * Math.sqrt(secondMagnitude);
    return denominator ? dotProduct / denominator : 0;
  }

  private getSourceHash(): string {
    return createHash("sha256").update(JSON.stringify(this.articles)).digest("hex");
  }

  private toPositiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private toScoreWindow(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 2 ? parsed : fallback;
  }

}
import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

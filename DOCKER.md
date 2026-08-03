# Pokretanje projekta pomoću Dockera

## Preduslovi

- Docker Desktop sa WSL 2 backendom
- LM Studio server na portu `1234`
- U LM Studio uključeno **Serve on Local Network**
- Qwen chat i Nomic embedding model dostupni; za Intel Iris koristiti GPU offload `Off`

## Prvo pokretanje

1. Kopirati `.env.example` kao `.env` i promeniti lozinke i JWT ključeve.
2. Pokrenuti LM Studio server i učitati modele.
3. U korenu projekta izvršiti:

```powershell
$env:COMPOSE_PARALLEL_LIMIT="2"
docker compose build
docker compose up -d
```

Klijent je dostupan na `http://localhost:5173`, a Gateway na `http://localhost:5000`.

## Svakodnevna upotreba

Pokretanje već napravljenih containera:

```powershell
docker compose start
```

Zaustavljanje bez brisanja:

```powershell
docker compose stop
```

Primena promena u kodu jednog servisa:

```powershell
docker compose build gateway
docker compose up -d gateway
```

Primena svih promena:

```powershell
$env:COMPOSE_PARALLEL_LIMIT="2"
docker compose build
docker compose up -d
```

## Provera i logovi

```powershell
docker compose ps -a
docker compose logs --tail=100 gateway
docker stats --no-stream
```

Stalni servisi treba da budu `Up (healthy)`. Servisi čije ime završava sa `-migrate`, kao i `auth-seed`, jednokratni su poslovi i očekivano završavaju statusom `Exited (0)`.

## Mreža i portovi

Javno su dostupni:

- `5173` — React/Nginx klijent
- `5000` — Gateway REST API i Socket.IO
- `5013` — slike oglasa

Baze i ostali mikroservisi dostupni su samo unutar Compose mreže `backend`. Containeri se međusobno pronalaze po imenima kao što su `user-service`, `ad-service` i `auth-db`.

## Trajni podaci

PostgreSQL baze, slike oglasa i AI embedding cache čuvaju se u named volume-ima. Komanda `docker compose down` ne briše te podatke.

Komanda ispod briše sve Compose volume-e i sve podatke projekta, pa je ne koristiti osim kada je namerno potreban potpuno prazan sistem:

```powershell
docker compose down -v
```

## Bezbedno oslobađanje prostora

```powershell
docker system df
docker builder prune
docker image prune
```

Ne koristiti `docker system prune --volumes`, jer može obrisati baze.

## LM Studio i Docker

AI container pristupa Windows LM Studio serveru preko `http://host.docker.internal:1234/v1`. Ako AI nije dostupan:

```powershell
docker compose exec ai-support-service node -e "fetch('http://host.docker.internal:1234/v1/models').then(r=>r.text()).then(console.log).catch(console.error)"
```

Kod Intel Iris grafike podesiti Qwen model na GPU offload `Off`, isključiti GPU KV cache i koristiti context length `2048` ili `4096`.

## Česte razlike između komandi

- `docker compose build` pravi image-e, ali ih ne pokreće.
- `docker compose up -d` pravi/reorganizuje containere i pokreće ih u pozadini.
- `docker compose start` pokreće već postojeće ugašene containere.
- `docker compose stop` gasi containere bez brisanja.
- `docker compose down` briše containere i mrežu, ali zadržava named volume-e.

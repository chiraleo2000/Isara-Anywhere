# Git subtree split — pushed (2026-06-26)

**Monorepo branch:** `v1.7.52-test-hardening` @ `91d4f427` (pushed to `github/v1.7.52-test-hardening`)

**Re-split:** After gate-release commit `91d4f427` (includes Dockerfile `NODE_ENV=development`, eslint, cloudbuild fixes).

| App | Prefix | Split branch | HEAD SHA | Tag |
|-----|--------|--------------|----------|-----|
| Patient | `Isara-patient-portal` | `split/patient-portal` | `8c38df7434144986043fbb440857f718aa8d4c85` | `patient-v1.7.55` |
| Doctor | `Isara-doctor-portal` | `split/doctor-portal` | `5c1fae388d058b4d7a86171f7a5bc1f6a2c5dddb` | `doctor-v1.7.55` |
| Meeting | `Izara-jitsi-server` | `split/meeting-server` | `76e5674887da8eea9570128e522fbec421ea0e5c` | `meeting-v1.7.55` |

## GitHub repos (private)

- https://github.com/chiraleo2000/Isara-patient-portal — `main` + `patient-v1.7.55` **pushed**
- https://github.com/chiraleo2000/Isara-doctor-portal — `main` + `doctor-v1.7.55` **pushed**
- https://github.com/chiraleo2000/Izara-jitsi-server — `main` + `meeting-v1.7.55` **pushed**

## Push commands (executed 2026-06-26)

```powershell
git push https://github.com/chiraleo2000/Isara-patient-portal.git split/patient-portal:main
git push https://github.com/chiraleo2000/Isara-doctor-portal.git split/doctor-portal:main
git push https://github.com/chiraleo2000/Izara-jitsi-server.git split/meeting-server:main

git tag -f patient-v1.7.55 split/patient-portal
git tag -f doctor-v1.7.55 split/doctor-portal
git tag -f meeting-v1.7.55 split/meeting-server
git push https://github.com/chiraleo2000/Isara-patient-portal.git patient-v1.7.55
git push https://github.com/chiraleo2000/Isara-doctor-portal.git doctor-v1.7.55
git push https://github.com/chiraleo2000/Izara-jitsi-server.git meeting-v1.7.55

git push -u github HEAD   # monorepo v1.7.52-test-hardening @ 91d4f427
```

**Note:** `origin` (Azure DevOps) push failed auth; GitHub `github` remote succeeded.

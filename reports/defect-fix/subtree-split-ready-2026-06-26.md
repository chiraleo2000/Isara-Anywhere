# Git subtree split — ready to push (2026-06-26)

**Monorepo branch:** `v1.7.52-test-hardening` (uncommitted gate fixes on working tree — includes Dockerfile `NODE_ENV=development` fix for cloud build)

**Stale SHA warning:** Split branches were cut before latest uncommitted changes (eslint, registerSW, useGoogleClientId, Dockerfile.unified). Re-run `git subtree split` after commit if push must include today's fixes.

| App | Prefix | Split branch | HEAD SHA |
|-----|--------|--------------|----------|
| Patient | `Isara-patient-portal` | `split/patient-portal` | `a42d0a49407e712e52d8da0c1ab2c10e0c9635f1` |
| Doctor | `Isara-doctor-portal` | `split/doctor-portal` | `81297008053b4a6e7902f52f721cb276b3e937c3` |
| Meeting | `Izara-jitsi-server` | `split/meeting-server` | `16a682996e3f297c783ad6e30ec227dc8025accb` |

## GitHub repos (private, created)

- https://github.com/chiraleo2000/Isara-patient-portal
- https://github.com/chiraleo2000/Isara-doctor-portal
- https://github.com/chiraleo2000/Izara-jitsi-server

## Push commands (requires explicit approval)

```powershell
cd c:\Users\chira\Documents\Isara-telemed\Isara-Anywhere

git push https://github.com/chiraleo2000/Isara-patient-portal.git split/patient-portal:main
git push https://github.com/chiraleo2000/Isara-doctor-portal.git split/doctor-portal:main
git push https://github.com/chiraleo2000/Izara-jitsi-server.git split/meeting-server:main

# Tags (after push)
git tag patient-v1.7.55 split/patient-portal
git tag doctor-v1.7.55 split/doctor-portal
git tag meeting-v1.7.55 split/meeting-server
git push https://github.com/chiraleo2000/Isara-patient-portal.git patient-v1.7.55
git push https://github.com/chiraleo2000/Isara-doctor-portal.git doctor-v1.7.55
git push https://github.com/chiraleo2000/Izara-jitsi-server.git meeting-v1.7.55
```

**Note:** Commit monorepo gate fixes before split if you need split SHAs to include latest changes.

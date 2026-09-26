@AGENTS.md

# 급지.gg (geupji)

수도권 대장아파트를 국토부 실거래가로 줄 세워 롤 티어(챌린저~아이언)를 매기는 공개 웹 서비스. "아파트판 op.gg": 홈은 티어표와 리더보드, 단지 페이지는 소환사 페이지(랭크·시즌 기록·티어 그래프). 어두운 남색 바탕, 색은 티어에만.

## 문서 지도

| 알고 싶은 것 | 볼 곳 |
|---|---|
| 지금 어디까지 됐고 다음에 뭘 하나 | [docs/STATUS.md](docs/STATUS.md) ← **세션 시작 시 여기부터** |
| 설계 전문 (규칙·구조) | Playground `부동산 티어 웹` 폴더의 `설계.md` (앞 날짜는 최근 작업일로 바뀜) |
| 지금 디자인 (롤 티어·레퍼런스) | 같은 폴더의 `디자인 v2 계획.md`. `설계.md`의 신문 디자인 절은 폐기됨 |
| 가격·티어 규칙의 정본 | `lib/stats/` 코드와 테스트 (`tiers.ts` 구간·자리·LP, `ladder.ts` 판 단위 순위) |
| 지역·대장 정의 | `data/regions.ts` |

## 스택

Next.js 16.3 (App Router, Turbopack, **Cache Components**) · React 19.2 · Prisma 7 + Postgres(로컬: 임베디드, 운영: Neon) · Vitest · oxlint · Vercel

## 명령어

```bash
npm run db:dev        # 로컬 Postgres (임베디드, 포트 54329). 다른 명령 전에 켜 둔다
npm run dev           # 개발 서버
npm test              # 단위 테스트 (lib/**/*.test.ts)
npm run test:int      # 통합 테스트 — db:dev가 떠 있어야 함, geupji_test DB를 따로 씀
npm run build         # 운영 빌드 (DB가 필요: 페이지를 빌드 때 미리 렌더)
npm run ingest        # 실거래 수집 (MOLIT_SERVICE_KEY 필요). --from/--to로 백필, --plan은 요청 목록만
npx tsx scripts/seed-sample.ts     # 로컬 DB에 가상 시장을 채움 (견본 데이터)
npx tsx scripts/inspect-edition.ts # 저장된 판의 순위·티어·LP·이벤트 출력
```

## 규칙

- **가격 규칙은 `lib/stats`의 순수 함수에만 둔다.** 페이지는 계산하지 않고 표시만 한다. 규칙을 바꾸면 테스트부터 고친다(TDD).
- **티어는 판 단위로 매긴다.** 챌린저 1자리·그마 2자리는 순위로 정해지므로 `rankEdition`(lib/stats/ladder.ts)이 판을 발행할 때 순위·티어·디비전·LP, 월별 래더, 연말 시즌을 한꺼번에 계산해 스냅숏에 저장한다. 티어 구간을 바꾸면 `seed-sample.ts`나 수집으로 판을 다시 발행해야 화면에 반영된다.
- **뉴스는 없다.** 헤드라인·기사 문장·1면은 사용자가 뺐다(2026-09-26). 이벤트(승급·강등·신고가·해제)는 배지로만 쓴다.
- **대장 단지는 사용자가 직접 고른다.** 받은 목록은 `data/regions.ts`의 `leaderAptSeq`에 넣는다. 지정이 없으면 대표가가 가장 높은 단지가 임시 대장이다.
- **운영 DB 주소를 `.env.local`에 넣지 않는다.** 로컬은 임베디드 Postgres다. `seed-sample.ts`는 localhost가 아니면 거부한다.
- `NEXT_PUBLIC_SAMPLE_DATA=1`이면 "견본 데이터" 띠가 뜬다. 실데이터로 바꿀 때 `.env.local`에서 지운다.
- 티어 구간·자리 수는 `lib/stats/tiers.ts` 한 곳에만 있다.
- 엠블럼은 `lib/emblem/geometry.ts`가 평면 다각형으로 그린다(집 모양 원석 + 날개·왕관). 그라디언트·필터를 쓰지 않아야 공유 카드(Satori)에서도 똑같이 나온다. Riot 엠블럼 이미지는 쓰지 않는다.
- 티어색은 `--t-*` 토큰과 `lib/emblem/colors.ts`에 있다. 10색은 색만으로 구분이 안 되니 항상 엠블럼이나 티어 이름을 곁에 둔다. 차트는 강조형(흐린 선 + 강조 한두 개)으로 그린다.
- CSS 모듈에서 전역 클래스(`num`, `up`, `down`)를 고를 때는 `:global(.num)`처럼 쓴다. 그냥 `.num`이라 쓰면 해시돼서 안 먹는다.
- 시군구 코드는 개편된다(화성 41590→동탄구 41597, 2026.02 / 인천 서구 28260→서해구 28275·검단구 28290, 2026.07). `data/regions.ts`에 기간별로 둔다. 확인 출처는 국토교통부 「전국 법정동」 파일.
- 차트는 넓은 판과 좁은 판을 둘 다 렌더하고 `.wide-only` / `.narrow-only`로 고른다(SVG 글자는 화면 폭 따라 줄어들기 때문).
- 모션은 티어 보드가 처음 뜰 때 한 번(위에서부터 차례로)뿐이다. 핵심 정보에 스크롤 연동 애니메이션을 걸지 않는다.
- **커밋·push·배포는 사용자에게 확인받는다.** GitHub/Vercel/Neon 연결도 마찬가지.

## 화면 검증

Chrome MCP는 localhost가 막혀 있다. Playwright를 세션 스크래치패드에 `npm install playwright --no-save`로 깔아 쓴다. **스크롤하며 뷰포트 단위로** 찍고 `getBoundingClientRect`로 px를 잰다. Git Bash에서 `/about` 같은 경로를 인자로 넘길 때는 `MSYS_NO_PATHCONV=1`을 붙인다.

DB를 다시 시드한 뒤에는 개발 서버의 `use cache`가 옛 판을 들고 있으니 `/api/revalidate`에 `x-revalidate-secret` 헤더로 POST 한다. Prisma 스키마를 바꾸면 `npx prisma generate` 후 개발 서버를 다시 켠다.

사용자가 개발 중 화면을 옆에서 보고 싶어 한다. 크롬을 별도 프로필 앱 창으로 화면 오른쪽 절반에 띄운다: `chrome.exe --user-data-dir=%LOCALAPPDATA%\geupji-preview --window-position=960,0 --window-size=960,1032 --app=http://localhost:3000`

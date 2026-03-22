# kiwoom-mcp 설치 및 설정

`java-jaydev/kiwoom-mcp`는 키움증권 REST API를 MCP 도구로 감싼 읽기 전용 서버입니다. 포트폴리오 조회, 현재가, 일봉 데이터를 제공합니다.

GitHub: https://github.com/java-jaydev/kiwoom-mcp

중요한 범위 제한:

- 키움 공식 REST API 가이드는 현재 `국내주식` 카테고리 아래 계좌, 시세, 주문, 차트, ETF 등을 제공하고, 모의투자 도메인은 `KRX만 지원가능`으로 안내합니다.
- 이 저장소의 `kr-portfolio-monitor`는 이 제약을 그대로 따르므로 국내주식(KRX) 보유분만 대상으로 합니다.
- 해외주식 포지션은 키움 REST API 기반 조회 범위 밖이므로 이 스킬 결과에 포함된 것처럼 쓰면 안 됩니다.

## 사전 조건

1. **키움증권 계좌** 보유
2. **키움 REST API 신청** — [openapi.kiwoom.com](https://openapi.kiwoom.com) 에서 신청 후 App Key와 Secret Key 발급
3. **IP 등록** — 키움 REST API 정책에 따라 호출 서버 IP를 사전 등록해야 합니다. 개인 PC에서 사용할 경우 공인 IP를 등록하세요.
4. **Node.js 18+** 및 **pnpm** 설치
5. **국내주식 대상 사용** — 이 MCP 흐름은 국내주식(KRX) 조회용으로 문서화되어 있습니다.

## 설치

```bash
git clone https://github.com/java-jaydev/kiwoom-mcp
cd kiwoom-mcp
pnpm install
pnpm build
```

빌드 결과물: `build/index.js`

## Claude Code 설정

프로젝트 루트 또는 홈 디렉토리에 `.mcp.json` 파일을 생성합니다.

```json
{
  "mcpServers": {
    "kiwoom": {
      "command": "node",
      "args": ["/절대경로/kiwoom-mcp/build/index.js"],
      "env": {
        "KIWOOM_APP_KEY": "발급받은 App Key",
        "KIWOOM_APP_SECRET": "발급받은 Secret Key",
        "KIWOOM_ACCOUNT_NUMBER": "계좌번호 (숫자만, 예: 1234567890)"
      }
    }
  }
}
```

`/절대경로/kiwoom-mcp/` 부분을 실제 클론 경로로 변경하세요.

## 환경변수 방식 (선택)

`.mcp.json`에 키를 직접 넣는 대신 환경변수로 관리할 수 있습니다:

```bash
export KIWOOM_APP_KEY=발급받은_앱키
export KIWOOM_APP_SECRET=발급받은_시크릿키
export KIWOOM_ACCOUNT_NUMBER=계좌번호
```

그 후 `.mcp.json`의 `env` 블록은 비워두거나 생략합니다.

이 저장소의 보조 스크립트는 `.env.kiwoom.example` 형식도 함께 지원합니다. `scripts/run-kiwoom-mcp.js`와 `scripts/test-kiwoom-token.js`는 `KIWOOM_APP_SECRET`와 `KIWOOM_SECRET_KEY`, `KIWOOM_API_BASE_URL`와 `KIWOOM_BASE_URL`를 모두 인식합니다.

## 연결 확인

Claude Code에서 다음을 입력해 MCP 도구 목록이 나타나는지 확인합니다:

```
/kr-portfolio-monitor
```

kiwoom-mcp 도구 목록(`get_account_balance`, `get_stock_price`, `get_daily_chart` 등)이 표시되면 연결 성공입니다.

연결에 성공해도 조회 범위는 국내주식(KRX) 보유분 기준입니다.

## 제공 도구 목록

| 도구명 | 설명 |
|---|---|
| `get_account_balance` | 보유 포지션 목록, 평가손익, 잔고 조회 |
| `get_stock_price` | 특정 종목 현재가, PER, PBR, 시가총액 |
| `get_daily_chart` | 특정 종목 OHLCV 일봉 데이터 (기간 지정) |
| `get_stock_info` | 종목 기본 정보 (상장일, 업종, 자본금 등) |
| `get_market_index` | KOSPI/KOSDAQ 지수 현재값 |

(전체 도구 목록은 GitHub README 참조)

## 연결 실패 시 Fallback

kiwoom-mcp를 설정할 수 없는 경우 `scripts/portfolio-snapshot.js`를 사용합니다:

```bash
# examples/kr/portfolio-sample.json을 수동으로 작성 후:
node skills/kr-stock-analysis/scripts/portfolio-snapshot.js \
  --input examples/kr/portfolio-sample.json
```

이 스크립트는 Yahoo Finance에서 각 티커의 가격과 일봉 데이터를 직접 조회합니다. `examples/kr/portfolio-sample.json`의 입력 형식은 `skills/kr-stock-analysis/references/script-inputs.md`를 참조하세요.

## 보안 주의사항

- App Key와 Secret Key를 Git 저장소에 커밋하지 마세요.
- `.mcp.json`을 `.gitignore`에 추가하거나 환경변수 방식을 사용하세요.
- 키움 REST API는 읽기 전용 조회이므로 이 MCP 서버는 주문·매매 기능을 제공하지 않습니다.
- 키움 REST API 범위는 이 저장소 기준으로 국내주식(KRX) 포트폴리오 모니터링에 한정합니다.

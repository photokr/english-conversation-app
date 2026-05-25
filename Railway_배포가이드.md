# Railway 클라우드 배포 가이드

> 이 가이드를 따라가면 앱이 인터넷에 24시간 올라갑니다.
> 컴퓨터를 꺼도 됩니다.

---

## 1단계 — GitHub 계정 준비

https://github.com 에서 계정을 만드세요 (이미 있으면 건너뜀).

---

## 2단계 — 프로젝트를 GitHub에 올리기

터미널에서 **english-app 폴더 안**에서 실행하세요.

```bash
cd ~/Documents/Claude/Projects/어플\ 개발/english-app
git init
git add .
git commit -m "first commit"
```

그 다음 GitHub에서 새 저장소(repository)를 만듭니다:
1. https://github.com/new 접속
2. Repository name: `english-app`
3. Private 선택 (API 키 보호)
4. **Create repository** 클릭

GitHub이 보여주는 명령어 중 아래 두 줄을 터미널에 붙여넣기:

```bash
git remote add origin https://github.com/[내아이디]/english-app.git
git push -u origin main
```

---

## 3단계 — Railway 계정 만들기

1. https://railway.app 접속
2. **GitHub으로 로그인** 클릭
3. english-app 저장소 접근 허용

---

## 4단계 — Railway에 배포

1. https://railway.app/new 접속
2. **Deploy from GitHub repo** 클릭
3. `english-app` 저장소 선택
4. **Deploy Now** 클릭

Railway가 자동으로:
- `npm install` 실행
- `npm run build` 실행 (React 빌드)
- `node server.js` 실행

---

## 5단계 — 환경변수(API 키) 설정

Railway 대시보드에서:
1. 프로젝트 선택 → **Variables** 탭
2. **+ Add Variable** 클릭
3. 아래 두 개 입력:

| 변수명 | 값 |
|--------|-----|
| `ANTHROPIC_API_KEY` | sk-ant-api03-... (실제 키) |
| `PORT` | 3001 |

4. **Save** 클릭 → 자동 재배포 시작

---

## 6단계 — 도메인 확인

Railway 대시보드 → **Settings** → **Domains** 탭에서
`https://english-app-xxxx.railway.app` 형태의 주소를 확인합니다.

이 주소를 브라우저에서 열면 앱이 열립니다.
스마트폰에서도 동일한 주소로 접속 가능합니다.

---

## 이후 업데이트 방법

코드를 수정한 뒤:

```bash
git add .
git commit -m "수정 내용 설명"
git push
```

GitHub에 올리면 Railway가 자동으로 새 버전을 배포합니다.

---

## 요금

- 무료 플랜: 월 $5 크레딧 제공 (소규모 앱은 무료로 운영 가능)
- 초과 시 종량제 (실제 사용량만큼만 청구)
- 처음에는 무료 플랜으로 시작하세요.

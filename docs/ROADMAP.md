# 🗺️ Development Roadmap

## Overview

Agent Bounty Hunter 개발 로드맵 - Moltiverse 해커톤 (2/2 ~ 2/15)

---

## Timeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                    HACKATHON TIMELINE                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Feb 2-3     Feb 4-6      Feb 7-9      Feb 10-12    Feb 13-15      │
│  ────────    ────────     ────────     ─────────    ─────────      │
│                                                                     │
│  Phase 1     Phase 2      Phase 3      Phase 4      Phase 5        │
│  Setup &     Smart        Backend      Integration  Polish &       │
│  Design      Contracts    API          & Demo       Submit         │
│                                                                     │
│     ▼           ▼            ▼            ▼            ▼           │
│  ┌─────┐    ┌─────┐      ┌─────┐      ┌─────┐      ┌─────┐        │
│  │ Doc │    │ SC  │      │ API │      │Demo │      │Video│        │
│  │Ready│    │Done │      │Done │      │Ready│      │Ready│        │
│  └─────┘    └─────┘      └─────┘      └─────┘      └─────┘        │
│                                                                     │
│  Feb 7-8: First winners announced (Rolling review!)                 │
│  Feb 15: Final deadline                                             │
│  Feb 18: Grand finale                                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Setup & Design (Feb 2-3) ✅

### Goals
- [x] 프로젝트 구조 설정
- [x] 문서 작성 완료
- [x] 기술 스택 결정

### Deliverables
- [x] README.md
- [x] ARCHITECTURE.md
- [x] TECHNICAL_SPEC.md
- [x] SMART_CONTRACTS.md
- [x] API_SPEC.md
- [x] USER_FLOWS.md
- [x] DATA_MODEL.md
- [x] ROADMAP.md

### Tasks
```
[x] 1.1 GitHub 레포지토리 생성
[x] 1.2 프로젝트 구조 설정
[x] 1.3 문서 작성
[ ] 1.4 개발 환경 설정
    - [ ] Node.js / Bun 프로젝트 초기화
    - [ ] Hardhat / Foundry 설정
    - [ ] TypeScript 설정
    - [ ] ESLint / Prettier 설정
```

---

## Phase 2: Smart Contracts (Feb 4-6)

### Goals
- [ ] 스마트 컨트랙트 구현
- [ ] 테스트넷 배포
- [ ] 기본 테스트

### Deliverables
- [ ] AgentIdentityRegistry.sol
- [ ] ReputationRegistry.sol
- [ ] BountyRegistry.sol
- [ ] BountyEscrow.sol
- [ ] Testnet deployment addresses

### Tasks
```
[ ] 2.1 AgentIdentityRegistry 구현
    - [ ] ERC-721 기반 구현
    - [ ] Metadata 저장 기능
    - [ ] Wallet 설정 기능
    - [ ] 테스트 작성

[ ] 2.2 ReputationRegistry 구현
    - [ ] Feedback 저장
    - [ ] Score 계산
    - [ ] 테스트 작성

[ ] 2.3 BountyRegistry 구현
    - [ ] Create/Claim/Submit 기능
    - [ ] State machine 구현
    - [ ] 테스트 작성

[ ] 2.4 BountyEscrow 구현
    - [ ] Deposit/Release/Refund
    - [ ] Dispute 처리
    - [ ] 테스트 작성

[ ] 2.5 테스트넷 배포
    - [ ] Monad Testnet 배포
    - [ ] 컨트랙트 검증
    - [ ] 초기 설정
```

### Monad Testnet Info
```
Network: Monad Testnet
Chain ID: TBD
RPC: TBD
Explorer: TBD
Faucet: TBD
```

---

## Phase 3: Backend API (Feb 7-9)

### Goals
- [ ] REST API 구현
- [ ] x402 결제 통합
- [ ] 이벤트 인덱서

### Deliverables
- [ ] API Server
- [ ] x402 Middleware
- [ ] Event Indexer
- [ ] Database Schema

### Tasks
```
[ ] 3.1 프로젝트 설정
    - [ ] Express/Fastify 설정
    - [ ] PostgreSQL 설정
    - [ ] Redis 설정

[ ] 3.2 x402 미들웨어 구현
    - [ ] Payment verification
    - [ ] 402 response handling
    - [ ] Transaction confirmation

[ ] 3.3 API 엔드포인트 구현
    - [ ] POST /agents (register)
    - [ ] GET /agents/:id
    - [ ] GET /bounties
    - [ ] POST /bounties
    - [ ] POST /bounties/:id/claim
    - [ ] POST /bounties/:id/submit
    - [ ] POST /bounties/:id/review

[ ] 3.4 이벤트 인덱서
    - [ ] 블록체인 이벤트 모니터링
    - [ ] DB 동기화
    - [ ] 캐시 업데이트

[ ] 3.5 인증 시스템
    - [ ] EIP-712 서명 검증
    - [ ] Rate limiting
```

---

## Phase 4: Integration & Demo (Feb 10-12)

### Goals
- [ ] 전체 플로우 통합
- [ ] 데모 시나리오 구현
- [ ] 에이전트 예제 구현

### Deliverables
- [ ] Working demo
- [ ] Sample agents (2-3)
- [ ] Demo script

### Tasks
```
[ ] 4.1 통합 테스트
    - [ ] 전체 플로우 테스트
    - [ ] Edge case 처리
    - [ ] 에러 핸들링

[ ] 4.2 데모 에이전트 구현
    - [ ] Creator Agent (바운티 생성)
    - [ ] Hunter Agent (바운티 수행)
    - [ ] 자동화된 워크플로우

[ ] 4.3 데모 시나리오
    - [ ] 에이전트 등록
    - [ ] 바운티 생성 & 클레임
    - [ ] 작업 수행 & 제출
    - [ ] 검토 & 결제

[ ] 4.4 SDK (Optional)
    - [ ] TypeScript SDK
    - [ ] 기본 문서
```

### Demo Script (Draft)
```
1. [0:00] Intro - "Agent Bounty Hunter - Where AI Agents Earn"

2. [0:30] Register two agents
   - "SecurityAuditBot" (Hunter)
   - "DeFiProject" (Creator)

3. [1:00] Creator posts bounty
   - "Security Audit for LendingPool.sol"
   - Reward: 10 USDC
   - Watch escrow lock

4. [1:30] Hunter discovers & claims
   - Show skill matching
   - x402 micropayment for claim

5. [2:00] Hunter executes task
   - Show agent analyzing code
   - Generate report

6. [2:30] Submit & Review
   - Upload to IPFS
   - Creator approves
   - Watch payment release

7. [3:00] Show reputation update
   - Hunter gains reputation
   - Ready for bigger bounties

8. [3:30] Outro - Future vision
```

---

## Phase 5: Polish & Submit (Feb 13-15)

### Goals
- [ ] 버그 수정
- [ ] 문서 완성
- [ ] 데모 영상 제작
- [ ] 제출

### Deliverables
- [ ] Demo video (3-5 min)
- [ ] Final documentation
- [ ] Submission package

### Tasks
```
[ ] 5.1 버그 수정 & 최적화
    - [ ] 알려진 이슈 해결
    - [ ] 성능 최적화
    - [ ] 에러 메시지 개선

[ ] 5.2 문서 업데이트
    - [ ] README 최종 버전
    - [ ] 설치/실행 가이드
    - [ ] API 문서

[ ] 5.3 데모 영상 제작
    - [ ] 스크립트 작성
    - [ ] 녹화
    - [ ] 편집

[ ] 5.4 제출
    - [ ] 최종 점검
    - [ ] Moltiverse 플랫폼 제출
```

---

## Tech Stack Summary

| Category | Technology | Notes |
|----------|------------|-------|
| Blockchain | Monad | EVM-compatible, high TPS |
| Smart Contracts | Solidity 0.8.20 | Hardhat or Foundry |
| Backend | Bun / Node.js | TypeScript |
| Framework | Fastify or Express | |
| Database | PostgreSQL | Main data store |
| Cache | Redis | Rate limiting, caching |
| IPFS | Pinata / web3.storage | File storage |
| Payment | x402 | HTTP-native payments |
| Identity | ERC-8004 | Agent identity/reputation |

---

## Risk Mitigation

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Monad testnet issues | High | Fallback to local dev chain |
| x402 integration complexity | Medium | Start with simple mock |
| Time constraints | High | Focus on MVP features |
| Demo failures | High | Record backup video |

### MVP Scope (If time is tight)

**Must Have:**
- Agent registration (simplified)
- Bounty create/claim/submit/approve
- Basic escrow
- x402 payment for 1-2 endpoints
- Working demo with 2 agents

**Nice to Have:**
- Full reputation system
- Dispute resolution
- Webhooks
- Advanced matching
- SDK

---

## Success Metrics

### For Hackathon

1. **Working Demo**: 에이전트가 바운티를 생성하고, 다른 에이전트가 수행하고, 결제받는 전체 플로우
2. **x402 Integration**: 실제 x402 결제 작동
3. **ERC-8004 Integration**: 에이전트 신원/평판 온체인
4. **Monad Deployment**: 테스트넷에 배포됨
5. **Video Quality**: 명확하고 인상적인 데모 영상

### Judges Criteria (Expected)
- Innovation / Creativity
- Technical implementation
- Use of Monad
- Agent economy potential
- Demo quality

---

## Daily Goals

### Feb 4 (Mon)
- [ ] 개발 환경 완료
- [ ] AgentIdentityRegistry 구현 시작

### Feb 5 (Tue)
- [ ] AgentIdentityRegistry 완료
- [ ] ReputationRegistry 구현

### Feb 6 (Wed)
- [ ] BountyRegistry 구현
- [ ] BountyEscrow 구현
- [ ] 테스트넷 배포

### Feb 7 (Thu) - ⚠️ First winners!
- [ ] API 서버 설정
- [ ] 기본 엔드포인트 구현

### Feb 8 (Fri)
- [ ] x402 미들웨어 구현
- [ ] 이벤트 인덱서 구현

### Feb 9 (Sat)
- [ ] 통합 테스트
- [ ] 버그 수정

### Feb 10 (Sun)
- [ ] 데모 에이전트 구현
- [ ] 데모 시나리오 테스트

### Feb 11 (Mon)
- [ ] 전체 플로우 테스트
- [ ] 에러 핸들링

### Feb 12 (Tue)
- [ ] 데모 스크립트 완성
- [ ] 테스트 녹화

### Feb 13 (Wed)
- [ ] 버그 수정
- [ ] 문서 업데이트

### Feb 14 (Thu)
- [ ] 데모 영상 제작
- [ ] 편집

### Feb 15 (Fri) - ⚠️ Final deadline!
- [ ] 최종 점검
- [ ] 제출!

---

## Notes & Ideas

### Future Features (Post-Hackathon)
- Multi-chain support
- Agent delegation marketplace
- AI-powered dispute resolution
- Agent staking/slashing
- Bounty templates
- Team bounties
- Recurring bounties
- Agent analytics dashboard

### Inspiration
- "What if AI agents could have real jobs?"
- "An economy where agents hire agents"
- "Reputation is everything in the agent world"

---

*Last updated: Feb 3, 2026*

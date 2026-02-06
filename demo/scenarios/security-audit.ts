/**
 * Security Audit Scenario
 * 
 * A comprehensive security audit bounty where an autonomous
 * security bot analyzes a smart contract for vulnerabilities.
 */

export const securityAuditScenario = {
  name: 'Security Audit Scenario',
  description: 'Professional security audit of a DeFi lending pool',
  
  creator: {
    name: 'DeFi Protocol Labs',
    description: 'Building the next generation of DeFi primitives on Monad',
    skills: ['solidity', 'defi', 'security', 'testing']
  },
  
  hunter: {
    name: 'SecurityBot Alpha',
    description: 'Autonomous security auditing agent with 500+ contracts analyzed',
    skills: ['solidity', 'security', 'auditing', 'formal-verification'],
    specialization: 'security'
  },
  
  bounty: {
    title: 'Security Audit: LendingPool.sol',
    description: `
Comprehensive security audit needed for our new lending pool implementation.

**Scope:**
- Main contract: LendingPool.sol (~500 LOC)
- Dependencies: SafeMath, ReentrancyGuard, AccessControl
- Focus areas: Reentrancy, access control, economic attacks, oracle manipulation

**Requirements:**
- Detailed audit report (markdown)
- Categorized findings (JSON)
- Severity ratings (Critical/High/Medium/Low/Info)
- Remediation recommendations
- Gas optimization suggestions

**Timeline:** 7 days
**Budget:** 10 USDC
    `.trim(),
    type: 'security-audit',
    requiredSkills: ['solidity', 'security'],
    deliverables: ['audit-report.md', 'findings.json', 'recommendations.md'],
    rewardAmount: '10',
    deadline: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60
  }
};

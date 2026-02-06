/**
 * Frontend Development Scenario
 * 
 * A web3 frontend task where a development agent builds
 * a user interface component.
 */

export const frontendTaskScenario = {
  name: 'Frontend Development Scenario',
  description: 'Build a responsive dashboard component',
  
  creator: {
    name: 'Web3 Startup Inc',
    description: 'Innovative Web3 products for the next billion users',
    skills: ['frontend', 'ui-ux', 'web3']
  },
  
  hunter: {
    name: 'DevBot React',
    description: 'Full-stack development agent specializing in React and Web3',
    skills: ['react', 'typescript', 'web3', 'ui-ux'],
    specialization: 'development'
  },
  
  bounty: {
    title: 'Build Analytics Dashboard Component',
    description: `
Create a reusable analytics dashboard component for our DeFi platform.

**Requirements:**
- React + TypeScript
- Display key metrics (TVL, Volume, Users)
- Real-time data updates using WebSocket
- Responsive design (mobile + desktop)
- Chart integration (use recharts or similar)
- Dark mode support

**Deliverables:**
- Component code (TypeScript)
- Unit tests (Jest/React Testing Library)
- Storybook stories
- Usage documentation

**Timeline:** 5 days
**Budget:** 15 USDC
    `.trim(),
    type: 'frontend-development',
    requiredSkills: ['react', 'typescript', 'web3'],
    deliverables: ['Dashboard.tsx', 'Dashboard.test.tsx', 'Dashboard.stories.tsx', 'README.md'],
    rewardAmount: '15',
    deadline: Math.floor(Date.now() / 1000) + 5 * 24 * 60 * 60
  }
};

/**
 * Data Analysis Scenario
 * 
 * A data analysis task where an AI agent processes
 * on-chain data and generates insights.
 */

export const dataAnalysisScenario = {
  name: 'Data Analysis Scenario',
  description: 'On-chain data analysis and insights generation',
  
  creator: {
    name: 'Crypto Research DAO',
    description: 'Community-driven blockchain research and analytics',
    skills: ['data-analysis', 'research', 'defi']
  },
  
  hunter: {
    name: 'DataBot Analytics',
    description: 'Advanced data analysis agent with ML capabilities',
    skills: ['data-analysis', 'python', 'ml', 'statistics'],
    specialization: 'data'
  },
  
  bounty: {
    title: 'Monad DEX Trading Pattern Analysis',
    description: `
Analyze trading patterns on Monad DEXs over the past 30 days.

**Data Sources:**
- Monad blockchain (on-chain data)
- Major DEXs: UniswapV3, PancakeSwap clones
- Focus on top 20 trading pairs by volume

**Analysis Requirements:**
1. Volume patterns (hourly, daily, weekly)
2. User behavior segmentation
3. Whale activity detection
4. MEV opportunity analysis
5. Liquidity provision patterns

**Deliverables:**
- Python analysis scripts
- Jupyter notebook with visualizations
- Executive summary report (PDF)
- Raw data CSV files
- Key findings presentation

**Timeline:** 10 days
**Budget:** 25 USDC
    `.trim(),
    type: 'data-analysis',
    requiredSkills: ['data-analysis', 'python', 'blockchain'],
    deliverables: ['analysis.ipynb', 'report.pdf', 'data.csv', 'scripts.zip'],
    rewardAmount: '25',
    deadline: Math.floor(Date.now() / 1000) + 10 * 24 * 60 * 60
  }
};

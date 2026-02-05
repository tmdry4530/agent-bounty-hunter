#!/usr/bin/env bun
/**
 * Scenario Runner - Run different demo scenarios
 * 
 * Usage:
 *   bun run-scenario.ts [scenario-name]
 * 
 * Available scenarios:
 *   - security-audit (default)
 *   - frontend-task
 *   - data-analysis
 */

import chalk from 'chalk';

const scenarios = {
  'security-audit': {
    name: 'Security Audit',
    description: 'DeFi smart contract security audit',
    duration: '~2-3 min'
  },
  'frontend-task': {
    name: 'Frontend Development',
    description: 'React dashboard component',
    duration: '~2 min'
  },
  'data-analysis': {
    name: 'Data Analysis',
    description: 'On-chain trading pattern analysis',
    duration: '~3 min'
  }
};

function printHelp() {
  console.log(chalk.bold.cyan('\n🎯 Agent Bounty Hunter - Scenario Runner\n'));
  console.log(chalk.white('Usage: bun run-scenario.ts [scenario-name]\n'));
  console.log(chalk.white('Available scenarios:\n'));
  
  Object.entries(scenarios).forEach(([key, scenario]) => {
    console.log(chalk.cyan(`  ${key}`));
    console.log(chalk.gray(`    ${scenario.description}`));
    console.log(chalk.gray(`    Duration: ${scenario.duration}\n`));
  });
  
  console.log(chalk.yellow('Example:'));
  console.log(chalk.gray('  bun run-scenario.ts security-audit\n'));
}

async function runScenario(scenarioName: string) {
  const scenario = scenarios[scenarioName as keyof typeof scenarios];
  
  if (!scenario) {
    console.log(chalk.red(`\n❌ Unknown scenario: ${scenarioName}\n`));
    printHelp();
    process.exit(1);
  }
  
  console.log(chalk.bold.green(`\n🚀 Running scenario: ${scenario.name}\n`));
  console.log(chalk.gray(`Description: ${scenario.description}`));
  console.log(chalk.gray(`Duration: ${scenario.duration}\n`));
  
  // For now, all scenarios use the same demo script
  // In the future, you could import and run different scenarios
  console.log(chalk.yellow('⚠️  Custom scenario support coming soon!'));
  console.log(chalk.gray('For now, running default security audit demo...\n'));
  
  // Import and run the demo
  await import('./demo.js');
}

// Parse arguments
const args = process.argv.slice(2);
const scenarioName = args[0] || 'security-audit';

if (args.includes('--help') || args.includes('-h')) {
  printHelp();
  process.exit(0);
}

// Run the scenario
runScenario(scenarioName).catch(error => {
  console.error(chalk.red('\n❌ Error running scenario:'), error);
  process.exit(1);
});

const Helpers = require('./helpers')
const config = require('./config.json')
const fs = require('fs')
const log = require('pretty-log')

log.success(`Starting the locale analysis of: ${config.repo}...`)

/**
 * Execute The Processing
 * This is in the form of a function for asyncronous operations
 *
 * @returns {null} Does not return
 */
async function process () {
  const startTime = Date.now()
  const results = Helpers.buildSummary(config)
  const csvResults = Helpers.createCSV(results, config.cartridgeSortOrder)

  if (!csvResults) {
    log.error('Issues generating the CSV file!')
  } else {
    const validationResults = await Helpers.validateCSV(csvResults, config)
    if (validationResults) {
      fs.writeFileSync(config.csvOutput, csvResults)

      const endTime = Date.now()

      log.success(`Completed analysis and a CSV file has been saved to: ${config.csvOutput}.\nTime of execution: ${(endTime - startTime) / 1000} seconds!`)
    } else {
      log.error('The generated CSV did not validate!')
    }
  }
}

process()

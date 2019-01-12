const glob = require('glob')
const path = require('path')
const fs = require('fs')
const eol = require('eol')

const helpersProcessFilesResult = require('./mocks/helpers/process-files-result.json')
const helpersGetAllLocalesResult = require('./mocks/helpers/get-all-locales-result.json')
const helpersOrganizeResult = require('./mocks/helpers/organize-result.json')
const helpersFindAllPropertiesResult = require('./mocks/helpers/find-all-properties-result.json')
const helpersCreateCSVResult = eol.lf(fs.readFileSync('./mocks/helpers/create-csv.csv').toString())
const invalidCSVData = eol.lf(fs.readFileSync('./mocks/helpers/invalid-csv.csv').toString())

/**
 * Disable Console Log
 */
console.log = jest.fn()

const config = {
  'cartridgsToExclude': [
    'should_be_ignored'
  ],
  'cartridgeSortOrder': [
    'app_foo_core',
    'cartridge_a',
    'cartridge_c',
    'cartridge_b'
  ],
  'repo': `${path.join(__dirname, 'mocks', 'sample_repo')}`,
  'propertyGlobPattern': `${path.join('cartridges', '**', 'cartridge', 'templates', 'resources', '**', '*.properties')}`,
  'primaryLanguage': 'en'
}

const Helpers = require('./helpers')
let files = []

beforeAll(() => {
  files = glob.sync(`${path.join(config.repo, config.propertyGlobPattern)}`)
  expect(files.length).toBeGreaterThan(1)
})

test('Helpers -> processFiles -> Should Process the files correctly', () => {
  const results = Helpers.processFiles(config.repo, files, config.cartridgsToExclude)

  expect(results).toEqual(helpersProcessFilesResult)
})

test('Helpers -> getCartridgeName -> Should throw an error if a cartridge path cannot be found', () => {
  const validFile = 'mocks/sample_repo/cartridges/cartridge_a/cartridge/templates/resources/localegroupa_ca_EN.properties'
  const invalidFile = 'mocks/sample_repo/cartridges/cartridge_a/cartrasdfidge/templates/resources/localegroupa_ca_EN.properties'

  expect(() => {
    Helpers.getCartridgeName(validFile)
  }).not.toThrow()

  expect(() => {
    Helpers.getCartridgeName(invalidFile)
  }).toThrow()
})

test('Helpers -> getAllLocales -> Should return the valid list of locales', () => {
  let locales = Helpers.getAllLocales(config.repo, config.primaryLanguage)

  expect(locales).toEqual(helpersGetAllLocalesResult)

  locales = Helpers.getAllLocales(config.repo, 'fr')

  expect(locales[0]).toEqual('default')
  expect(locales[1]).toEqual('fr')
})

test('Helpers -> organize -> Should return the correct result', () => {
  let locales = Helpers.getAllLocales(config.repo, config.primaryLanguage)
  const preResults = Helpers.processFiles(config.repo, files, config.cartridgsToExclude)
  const postResults = Helpers.organize(preResults, locales)

  expect(postResults).toEqual(helpersOrganizeResult)
})

test('Helpers -> findAllProperties -> Should return the valid list of properties', () => {
  let locales = Helpers.getAllLocales(config.repo, config.primaryLanguage)
  const preResults = Helpers.processFiles(config.repo, files, config.cartridgsToExclude)
  const postResults = Helpers.organize(preResults, locales)
  const allProperties = Helpers.findAllProperties(postResults).sort()

  expect(allProperties).toEqual(helpersFindAllPropertiesResult)
})

test('Helpers -> buildSummary -> Should return the correct result', () => {
  const results = Helpers.buildSummary(config)

  expect(results.allProperties).toEqual(helpersFindAllPropertiesResult)
  expect(results.allLocales).toEqual(helpersGetAllLocalesResult)
  expect(results.properties).toEqual(helpersOrganizeResult)
})

test('Helpers -> createCSV -> Should return the correct result', async () => {
  const results = Helpers.buildSummary(config)

  expect(results.allProperties).toEqual(helpersFindAllPropertiesResult)
  expect(results.allLocales).toEqual(helpersGetAllLocalesResult)
  expect(results.properties).toEqual(helpersOrganizeResult)

  const csvResults = Helpers.createCSV(results, config.cartridgeSortOrder)
  expect(csvResults).toEqual(`${helpersCreateCSVResult}`)

  const csvIsValid = await Helpers.validateCSV(csvResults, config.repo)

  expect(csvIsValid).toBe(true)
})

test('Helpers -> validateCSV -> Should validate valid and invalid csv correctly', async () => {
  const csvIsValid = await Helpers.validateCSV(helpersCreateCSVResult.toString(), config.repo)
  expect(csvIsValid).toBe(true)

  const csvIsNotValid = await Helpers.validateCSV(invalidCSVData.toString(), config.repo)
  expect(csvIsNotValid).toBe(false)
})

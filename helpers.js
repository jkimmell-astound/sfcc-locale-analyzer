
const glob = require('glob')
const fs = require('fs')
const path = require('path')
const convert = require('xml-js')
const PropertiesReader = require('properties-reader')
const csvStringify = require('csv-stringify/lib/sync')
const log = require('pretty-log')
const csv = require('csvtojson')

log.debug = function () {}

const cartridgeNameRegex = new RegExp('(.*?)/cartridge/templates/')

/**
 * Helpers Class
 * Provides utility methods to assist with the analysis of locale
 * property files contained within a code repository
 */
class Helpers {
  /**
   * Retrieve the Locale Group from a file
   *
   * @example
   * // Returns localgroupa
   * Helpers.getLocaleGroup('mocks/sample_repo/cartridges/cartridge_a/cartridge/templates/resources/localegroupa_ca_EN.properties')
   *
   * @param {string} file File to analyze
   * @returns {string} Locale Group
   */
  static getLocaleGroup (file) {
    return file.replace(/_[a-z]{2}_?[A-Z]{0,2}.properties/g, '.properties').split('/').pop().replace('.properties', '')
  }

  /**
   * Retrieve the cartridge name from a file
   *
   * @example
   * // Returns cartridge_a
   * Helpers.getCartridgeName('mocks/sample_repo/cartridges/cartridge_a/cartridge/templates/resources/localegroupa_ca_EN.properties')
   *
   * @param {string} file File to Analyze
   * @return {string} Cartrige Name
   */
  static getCartridgeName (file) {
    const matches = file.match(cartridgeNameRegex)

    if (!matches) {
      throw new Error(`A cartridge could not be found for file: ${file}`)
    }

    let path = matches[ 1 ]
    let cartName = path.split('/').pop()

    return cartName
  }

  /**
   * Get Locale from a file
   *
   * @example
   * // Rreturns ca_EN
   * Helpers.getLocale('mocks/sample_repo/cartridges/cartridge_a/cartridge/templates/resources/localegroupa_ca_EN.properties')
     * @example
   * // Rreturns default
   * Helpers.getLocale('mocks/sample_repo/cartridges/cartridge_a/cartridge/templates/resources/localegroupa.properties')
     * @example
   * // Returns en
   * Helpers.getLocale('mocks/sample_repo/cartridges/cartridge_a/cartridge/templates/resources/localegroupa_en.properties')
   *
   * @param {string} fileName File to get locale from
   * @returns {string} locale of the file
   */
  static getLocale (fileName) {
    const file = fileName.split('/').pop()
    const parts = file.split('_')

    if (parts.length === 2) {
      return parts.pop().replace('.properties', '')
    }

    if (parts.length === 3) {
      return `${parts[1]}_${parts[2].replace('.properties', '')}`
    }

    if (parts.length > 3) {
      throw new Error(`${fileName} has more than 3 parts when split on _`)
    }

    return 'default'
  }

  /**
   * Build a Summary of the locale properties found in the configuration repository.
   *
   * @param {Object} config Configuration Object
   * @returns {Object} Summary Object of all properties found
   */
  static buildSummary (config) {
    log.debug('buildSummary -> Starting to build summary...')

    /**
     * Retrive all locales contained in the site meta data,
     * this is used for the final result and also to validate the
     * locale files found in the code base
     */
    const allLocales = Helpers.getAllLocales(config.repo, config.primaryLanguage)

    /**
     * Find all .properties files in the repo using a file "glob"
     * If files is "falsey" return fals for the method
     */
    const fileGlob = path.join(config.repo, config.propertyGlobPattern)
    const files = glob.sync(fileGlob)

    if (!files) {
      log.error('buildSummary -> No property files were found in the repository!')
      return false
    }

    let returnResults = false

    /**
     * Try to build the final results
     */
    try {
      let results = Helpers.processFiles(config.repo, files, config.cartridgsToExclude)
      results = Helpers.organize(results, allLocales)

      const allProperties = Helpers.findAllProperties(results).sort()

      returnResults = {
        'allLocales': allLocales,
        'allProperties': allProperties,
        'properties': results
      }
    } catch (e) {
      throw e
    }

    log.debug('buildSummary -> Finished building summary!')

    return returnResults
  }

  /**
   * Find all locales that are defined in the site meta data of the repository
   *
   * @param {string} directory Repository directory to analyze
   * @param {string} primaryLanguage Primary Language
   * @returns {Array} An array of all locales found
   */
  static getAllLocales (directory, primaryLanguage) {
    log.debug('getAllLocales -> Finding all locales in the sites meta data...')

    /**
     * Find all Site Prefence files, so we can look for locales across all sites
     */
    let files = glob.sync(`${directory}/sites/site_template/**/preferences.xml`)
    let locales = []

    files = files.filter(function (file) {
      log.debug('getAllLocales -> Ignoring the RefArch site')
      return !file.includes('RefArch')
    })

    files.forEach(function (file) {
      /**
       * Process the XML Document and find all configured locales
       */
      const result = JSON.parse(convert.xml2json(fs.readFileSync(file)))

      var standardPreferences = result.elements.pop().elements[ 0 ].elements

      standardPreferences.forEach(function (instance) {
        if (typeof instance.elements === 'object') {
          var localeElements = instance.elements.filter(function (element) {
            return element.attributes[ 'preference-id' ] === 'SiteLocales'
          })

          localeElements.forEach(function (localeElement) {
            localeElement.elements.forEach(function (locale) {
              const foundLocales = locale.text.split(':')

              foundLocales.forEach(function (foundLocale) {
                if (foundLocale.includes('_') > -1) {
                  const parts = foundLocale.split('_')

                  if (locales.indexOf(parts[ 0 ]) <= -1) {
                    locales.push(parts[ 0 ])
                  }
                }

                if (locales.indexOf(foundLocale) <= -1) {
                  locales.push(foundLocale)
                }
              })
            })
          })
        }
      })
    })

    /**
     * Sort all of the locales found
     * default should be first, then language only locales sorted alphabetically
     * and then country locales sorted alphabetically
     */
    log.debug('getAllLocales -> Sorting found locales...')
    locales = locales.sort(function (a, b) {
      if (a === b) return 0
      if (a === 'default') return -1
      if (b === 'default') return 1

      if (!a.includes('_') && b.includes('_')) return -1
      if (a.includes('_') && !b.includes('_')) return 1
      if (!a.includes('_') && !b.includes('_') && a === primaryLanguage) return -1
      if (!a.includes('_') && !b.includes('_') && b === primaryLanguage) return 1
      if (!a.includes('_') && !b.includes('_')) return a.localeCompare(b)

      const aLocaleParts = a.split('_')
      const bLocaleParts = b.split('_')

      if (aLocaleParts[ 0 ] === primaryLanguage && bLocaleParts[ 0 ] !== primaryLanguage) return -1
      if (aLocaleParts[ 0 ] !== primaryLanguage && bLocaleParts[ 0 ] === primaryLanguage) return 1
      if (aLocaleParts[ 0 ] === primaryLanguage && bLocaleParts[ 0 ] === primaryLanguage) return aLocaleParts[ 1 ].localeCompare(bLocaleParts[ 1 ])
      if (aLocaleParts[ 0 ] !== bLocaleParts[ 0 ]) return aLocaleParts[ 0 ].localeCompare(bLocaleParts[ 0 ])

      return aLocaleParts[ 1 ].localeCompare(bLocaleParts[ 1 ])
    })

    log.debug(`getAllLocales -> Found: ${locales.length} locales in the meta data!`)

    return locales
  }

  /**
   * Get Properties in a File
   * Read the contents of the supplied file and parse all locale entries and add to the
   * localeSections array. Results will stack to allow overrides between files.
   *
   * @param {string} file file to process
   * @returns {Object} file locale entries
   */
  static getProperties (file) {
    log.debug(`getProperties -> Retrieving properties from file: ${file}`)

    let entries = {}
    /**
     * Read Locale File and parse the content
     */
    let parsedProperties = PropertiesReader(file)._properties // eslint-disable-line no-underscore-dangle

    const entryKeys = Object.keys(parsedProperties)

    entryKeys.forEach(function (entryKey) {
      const cleanKey = entryKey.trim()
      entries[ cleanKey ] = parsedProperties[ entryKey ].trim()
    })

    log.debug(`getProperties -> Found ${entries.length} properties in the file!`)

    return entries
  }

  /**
   * Process Files
   * Takes an array of property files and convert the file name into an
   * object that contains the relevant details about the property file
   *
   * @param {string} repo Code Repository that the files were found in
   * @param {Array} files Property Files to analyze
   * @param {Array} cartridgesToExclude Which cartridges should be excluded from the results
   * @returns {Array} An array of property files and some relevant meta data about the file
   */
  static processFiles (repo, files, cartridgesToExclude) {
    log.debug('processFiles -> Starting to process the files...')

    let filteredResults = files.filter((file) => {
      return (cartridgesToExclude.indexOf(Helpers.getCartridgeName(file)) <= -1)
    })

    let results = filteredResults.map((file) => {
      let returnObject = {
        file: file.replace(repo, '')
      }

      try {
        returnObject.cartridgeName = Helpers.getCartridgeName(file)
        returnObject.localeGroup = Helpers.getLocaleGroup(file)
        returnObject.locale = Helpers.getLocale(file)
        returnObject.properties = Helpers.getProperties(file)
      } catch (e) {
        returnObject.error = e
      }

      return returnObject
    })

    log.debug('processFiles -> Finished processing files!')

    return results
  }

  /**
   * Organize an array of files, with their properties, in the final structure of the Summary JSON Object
   *
   * @example {
   *  "app_foo_core": {
   *   "form": {
   *     "default": [
   *       {
   *         "foo": "bar"
   *       }
   *     ]
   *   }
   * }
   * }
   *
   * @param {Array} filesToOrganize An array of files with details about the file and the properties contained in the file
   * @param {Array} validLocales Locales that are valid for the applicaton, properties that use an invalid locale will be ignored
   * @returns {Object} An organized copy of the results
   */
  static organize (filesToOrganize, validLocales) {
    log.debug('organize -> Starting to organize the results...')

    let results = filesToOrganize.reduce((acc, cur) => {
      if (validLocales.indexOf(cur.locale) <= -1) {
        log.error(`organize -> Locale: ${cur.locale} does not exist in all locales found in site definition!`)
      }

      if (Object.keys(acc).indexOf(cur.cartridgeName) <= -1) {
        acc[cur.cartridgeName] = {}
      }

      if (Object.keys(acc[cur.cartridgeName]).indexOf(cur.localeGroup) <= -1) {
        acc[cur.cartridgeName][cur.localeGroup] = {}
      }

      Object.keys(cur.properties).forEach((propKey) => {
        if (Object.keys(acc[cur.cartridgeName][cur.localeGroup]).indexOf(propKey) <= -1) {
          acc[cur.cartridgeName][cur.localeGroup][propKey] = {}
        }

        acc[cur.cartridgeName][cur.localeGroup][propKey][cur.locale] = cur.properties[propKey]
      })

      return acc
    }, {})

    log.debug('organize -> Finished organizing the results!')

    return results
  }

  /**
   * Find all locale groups / properties found in a result object
   *
   * @param {Object} results Results Object from the organize method
   * @returns {Array} An array of locale groups and properties found in the object, sorted
   */
  static findAllProperties (results) {
    log.debug('findAllProperties -> Starting to find all properties in results...')

    let props = Object.values(results).reduce((acc, cur) => {
      Object.keys(cur).forEach((localeGroup) => {
        if (!acc[localeGroup]) {
          acc[localeGroup] = []
        }
        const props = Object.keys(cur[localeGroup])

        props.forEach((propKey) => {
          if (acc[localeGroup].indexOf(propKey) <= -1) {
            acc[localeGroup].push(propKey)
          }
        })
      })
      return acc
    }, {})

    /**
     * Sort Locale Groups
     */
    const sortedLocaleGroups = Object.keys(props).sort()

    const updatedResults = sortedLocaleGroups.map((localeGroup) => {
      return {
        localeGroup: localeGroup,
        properties: props[localeGroup].sort()
      }
    })

    log.debug('findAllProperties -> Finished finding all properties!')

    return updatedResults
  }

  /**
   * Create CSV
   * Create a CSV string that can be written to file with the results of the execution
   *
   * @param {Object} results Property Object to generate CSV from
   * @param {Object} cartridgeSortOrder Cartridge Sort Order
   * @returns {string} CSV Results
   */
  static createCSV (results, cartridgeSortOrder) {
    log.debug('createCSV -> Starting to generate the CSV...')

    const properties = results.properties
    const allProperties = results.allProperties
    const allLocales = results.allLocales

    let propFoundIn = {}

    /**
     * Cheap clone because reverse will reverce the array reference
     */
    const reversedCartridgeSortOrder = JSON.parse(JSON.stringify(cartridgeSortOrder)).reverse()
    reversedCartridgeSortOrder.forEach((cartridge) => {
      if (properties[cartridge]) {
        Object.keys(properties[cartridge]).forEach((localeGroup) => {
          const propsFound = Object.keys(properties[cartridge][localeGroup])

          propsFound.forEach((property) => {
            if (!propFoundIn[`${localeGroup}.${property}`]) {
              propFoundIn[`${localeGroup}.${property}`] = cartridge
            }
          })
        })
      }
    })

    let titleRow = [
      'Cartridge',
      'Locale Group',
      'Property',
      'Defined In'
    ]

    titleRow = titleRow.concat(allLocales)

    let csvResults = [titleRow]

    cartridgeSortOrder.forEach((cartridge) => {
      /**
       * If the cartridge name matches app_*_core, use all properties
       * otherwise only use the properties found
       */
      if (properties[cartridge]) {
        allProperties.forEach((localeGroupObject) => {
          const localeGroup = localeGroupObject.localeGroup
          const propsFound = localeGroupObject.properties

          propsFound.forEach((propKey) => {
            let row = [
              cartridge,
              localeGroup,
              propKey,
              propFoundIn[`${localeGroup}.${propKey}`]
            ]

            const localeProps = allLocales.map((locale) => {
              return properties[cartridge][localeGroup] &&
                properties[cartridge][localeGroup][propKey] &&
                properties[cartridge][localeGroup][propKey][locale] ? properties[cartridge][localeGroup][propKey][locale] : ''
            })

            row = row.concat(localeProps)

            if (
              cartridge.match(/app_(.*?)_core/ig) ||
              (
                properties[cartridge][localeGroup] &&
                properties[cartridge][localeGroup][propKey]
              )
            ) {
              csvResults.push(row)
            }
          })
        })
      }
    })

    log.debug('createCSV -> Finished generating the CSV!')

    return csvStringify(csvResults)
  }

  /**
   * Validate the contents of a CSV export, to ensure
   * that it matches the files in the repository
   *
   * @param {string} csvResults CSV Results
   * @param {string} repo Code Repository
   * @returns {boolean} Is the CSV valid?
   */
  static async validateCSV (csvResults, repo) {
    if (!csvResults) {
      log.error('You must specify csv results!')
      return false
    }

    if (!repo) {
      log.error('You must specify a repo!')
      return false
    }

    const csvJSON = await csv().fromString(csvResults)
    let csvValid = true

    csvJSON.forEach((row) => {
      const cartName = row.Cartridge
      const localeGroup = row['Locale Group']
      const property = row.Property

      delete row.Cartridge
      delete row['Locale Group']
      delete row.Property
      delete row['Defined In']

      const locales = row

      Object.keys(locales).forEach((locale) => {
        const propertyValue = locales[locale]
        const fileName = `${repo}/**/${cartName}/cartridge/templates/resources/${localeGroup}${locale !== 'default' ? '_' + locale : ''}.properties`
        const files = glob.sync(fileName)

        if (files.length > 1) {
          throw new Error(`More than one file found for pattern: ${fileName}`)
        }

        const file = files.pop()

        if (propertyValue === '') {
          if (file) {
            // console.log(`Empty property: ${property} found for file: ${fileName}`)
            throw new Error('Need to code for this scenario')
          }
        } else {
          const fileProps = PropertiesReader(file)._properties // eslint-disable-line no-underscore-dangle
          if (!fileProps[property] || fileProps[property] !== propertyValue) {
            log.error(`File: ${file} does not contain a property:'${property}' with value '${propertyValue}'`)
            csvValid = false
          }
        }
      })
    })

    return csvValid
  }
}

module.exports = Helpers

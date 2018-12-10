#!/usr/bin/env node

const fs = require('fs'), // File System Operations
    PropertiesReader = require('properties-reader'), // Read / Parse Java Property Files
    config = require('./config.json') // Configurations for run time

/**
 * Reverse the order of cartridges because precedence occurs from right to left
 */
const cartridges = config.cartridges.reverse()

/**
 * Main Loop
 * This block will loop across the cartridges and analyze any locale files found
 * all results across files and cartridges will be compiled in the localeSections array
 */
let localeSections = {}

for (let key in cartridges) {
    if (cartridges[key]) {
	let cartridgePath = cartridges[key]

	let cartLocaleFiles = fs.readdirSync(cartridgePath + config.templateDir)

	for (let key in cartLocaleFiles) {
	    if (cartLocaleFiles[key]) {
		analyzeFile(cartridgePath + config.templateDir + cartLocaleFiles[key])
	    }
	}
    }
}

/**
 * Output results to JSON and CSV
 */
outputResults(localeSections)

/**
 * Analyze File
 * Read the contents of the supplied file and parse all locale entries and add to the
 * localeSections array. Results will stack to allow overrides between files.
 * @param {String} value
 */
function analyzeFile(value) {
    console.log("Analyzing: " + value + "...")

    let localeFile = {
		"file": value,
		"fileName": value.split("/").pop(),
		"name": value.split("/").pop().replace(".properties", ""),
		"localeSection": ""
    }

    let localeParts = localeFile.name.split("_")
	delete localeParts[0]

	localeFile.locale = localeParts.join("_").substr(1)
	
	if (localeFile.locale !== "" && config.localesToUse.indexOf(localeParts[1]) <= -1) {
		console.log("Locale file, is not in the requested locales: " + localeFile.fileName)
		return
	}

    /**
     * If no locale was found, this must be a default file
     */
    if (localeFile.locale === "") {
		localeFile.locale = "default"
    }

    /**
     * Find the locale section by removing the locale from the filename
     */
    localeFile.localeSection = localeFile.name.replace("_" + localeFile.locale, "")

    /**
     * Do some prep work / initialization to the localeSections array
     */
    if (!localeSections[localeFile.localeSection]) {
		localeSections[localeFile.localeSection] = {
			files: [],
			locales: [],
			entries: {}
		}
    }

    localeSections[localeFile.localeSection].files.push(localeFile.file)

    /**
     * Add Locale if applicable
     */
    let saveLocale = false
    for (let key in config.localesToUse) {
	if (config.localesToUse[key]) {
	    if (localeFile.locale.indexOf(config.localesToUse[key]) > -1) saveLocale = true
	}
    }

    if (saveLocale && localeSections[localeFile.localeSection].locales.indexOf(localeFile.locale) < 0) {
	localeSections[localeFile.localeSection].locales.push(localeFile.locale)
    }

    /**
     * Read Locale File and parse the content
     */
    let parsedProperties = PropertiesReader(value)._properties

    for (let entryKey in parsedProperties) {
	if (parsedProperties[entryKey]) {
	    let entryValue = parsedProperties[entryKey]

	    /**
	     * Important so that trailing spaces don't create multiple keys
	     */
	    entryKey = entryKey.trim()
	    entryValue = entryValue.trim()

	    /**
	     * Initialize
	     */
	    if (!localeSections[localeFile.localeSection].entries[entryKey]) {
		localeSections[localeFile.localeSection].entries[entryKey] = {}
	    }

	    /**
	     * Set
	     */
	    localeSections[localeFile.localeSection].entries[entryKey][localeFile.locale] = entryValue
	}
    }
}

/**
 * Output results to JSON and CSV
 *
 * @param {Array} localeSections
 */
function outputResults(localeSections) {
    let output = ""

    fs.writeFile("./output/translations.json", JSON.stringify(localeSections, null, "\t"))
    let localeSectionsKeys = Object.keys(localeSections)

    for (let key in localeSectionsKeys) {
	if (localeSectionsKeys[key]) {
	    let localeSection = localeSections[localeSectionsKeys[key]]

	    output += localeSectionsKeys[key] + "\n"

	    for (let key in localeSection.files) {
		if (localeSection.files[key]) {
		    let file = localeSection.files[key].replace(config.cartridgtePrefix, "").replace(config.templateDir, "/.../")
		    output += file + "\n"
		}
	    }

	    output += "Key,"
	    for (let key in localeSection.locales) {
		if (localeSection.locales[key]) {
		    let locale = localeSection.locales[key]
		    output += locale + ","
		}
	    }
	    output += "\n"

	    for (let entryKey in localeSection.entries) {
		if (localeSection.entries[entryKey]) {
		    let entry = localeSection.entries[entryKey]

		    if (!entry["default"] || entry["default"] === "" || entry["default"].length < 1) {
			console.log("Skipping entry where default value is not present ... " + localeSectionsKeys[key] + " - " + entryKey)
			continue
		    }

		    output += entryKey + ","

		    for (let key in localeSection.locales) {
			if (localeSection.locales[key]) {
			    let locale = localeSection.locales[key]

			    if (entry[locale]) {
				if (config.showMissingOnly && locale !== "default") {
				    output += ","
				} else {
				    output += "\"" + entry[locale].replace("\"", "\"\"") + "\","
				}
			    } else {
				output += "||||MISSING|||||,"
			    }
			}
		    }

		    output += "\n"
		}
	    }

	    output += "\n"
	}
    }

    fs.writeFile("./output/translations.csv", output)
}
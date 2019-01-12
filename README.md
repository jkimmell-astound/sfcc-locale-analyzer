# Locale Analyzer

[![Build Status](https://travis-ci.org/kimmellj/sfcc-locale-analyzer.svg?branch=develop)](https://travis-ci.org/kimmellj/sfcc-locale-analyzer)

## Requirements
* This application may run on previous versions of NodeJS but has been developed and tested with version: `~v10.0.0`
    * If this is different from the current version of NodeJS on your machine, you can use the NVM tool to install another: https://github.com/creationix/nvm
* While it may run with other repository structures the one found in the `mocks/sample_repo` is what this was developed against.

## Objectives

*Create a CSV / Spreadsheet file that meets the following requirements:*
* All properties found in the cartridges of repository should be listed as rows in the spreadsheet
* Properties should be grouped by locale group and then cartridge their found in
* Any cartridges that have a name that looks like: `app_foo_core` should have all properties found in all files
* All locales found in the site meta data of the repository should be listed as columns in the spreadsheet
* Each property row, will contain a column and that contains the original cartridge that the property was found in
* Properties should be sorted alpha-numerically within their locale group
* Locale Groups should be sorted alphanumerically

## Example
Give the sample repository in the `mocks/sample_repo` directory, the following CSV will be generated:
```
Cartridge,Locale Group,Property,Defined In,default,en,ca,fr,it,ja,ca_EN,ja_JP
app_foo_core,form,foo,app_foo_core,bar,,,,,,,
app_foo_core,localegroupa,sunny.day,cartridge_c,,,,,,,,
app_foo_core,localegroupb,starry.night,cartridge_b,,,,,,,,
app_foo_core,localegroupc,green.grass,cartridge_c,,,,,,,,
cartridge_a,localegroupa,sunny.day,cartridge_c,Sunny Day,Sunny Day EN,,Journée ensoleillée,Giorno soleggiato,,Sunny Day CA EN,晴れた日
cartridge_c,localegroupa,sunny.day,cartridge_c,,,,,Wrong Italian,,,
cartridge_c,localegroupc,green.grass,cartridge_c,Green Grass,,,L'herbe verte,Erba verde,,,緑の草
cartridge_b,localegroupb,starry.night,cartridge_b,Stary Night,Light Moon,,,,,Darky Moon,星が輝く夜
```

The above CSV will be generated from the following JSON:
```JSON
{
    "app_foo_core":{
       "form":{
          "foo":{
             "default":"bar"
          }
       }
    },
    "cartridge_a":{
       "localegroupa":{
          "sunny.day":{
             "ca_EN":"Sunny Day CA EN",
             "default":"Sunny Day",
             "en":"Sunny Day EN",
             "fr":"Journée ensoleillée",
             "it":"Giorno soleggiato",
             "ja_JP":"晴れた日"
          }
       }
    },
    "cartridge_b":{
       "localegroupb":{
          "starry.night":{
             "ca_EN":"Darky Moon",
             "default":"Stary Night",
             "en":"Light Moon",
             "ja_JP":"星が輝く夜"
          }
       }
    },
    "cartridge_c":{
       "localegroupa":{
          "sunny.day":{
             "it":"Wrong Italian"
          }
       },
       "localegroupc":{
          "green.grass":{
             "default":"Green Grass",
             "fr":"L'herbe verte",
             "it":"Erba verde",
             "ja_JP":"緑の草"
          }
       }
    }
 }
```

## Getting Started

Install the necessary `node_modules`:
```
npm install
```

Copy `config.sample.json` to `config.json` and update the relevant values:
```
cp config.sample.json config.json
```

Test the application:
```
npm test
```

Lint the application:
```
npm run lint
```

Generate Documentation:
```
npm run docs
```

Generate Coverage Report:
```
npm run cover
```

Run the application:
```
npm start
```
## Configuration
This application can be configured using a `config.json` file in the root of the repository.

The following are some notes for each attribute and what they do:

```
{
  "cartridgsToExclude": [ // Which cartridges should be excluded from anlysis
      "should_be_ignored"
  ],
  "cartridgeSortOrder": [ // How are cartridges sorted, in regards to the "Cartridge Path"
      "app_foo_core",
      "cartridge_a",
      "cartridge_c",
      "cartridge_b"
  ],
  "repo": "./mocks/sample_repo/", // Code Repository to analyze
  "propertyGlobPattern": "cartridges/**/cartridge/templates/resources/**/*.properties", // A "Glob" pattern for the locale property files
  "primaryLanguage": "en", // The Primary language of the application, this will be sorted first after "default"
  "csvOutput": "./output/results.csv" // Where should the CSV output go
}
```

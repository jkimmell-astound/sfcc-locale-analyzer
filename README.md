# sfcc-locale-analyzer

This NodeJS code can be used to analyze the locale property files of a Salesforce Commerce Cloud Application. This code will generate a CSV and JSON file with a breakdown of all language tags and the corresponding translated values for a set of locales.

## Configuration
To start copy the `sample.config.json` file to `config.json`.

The following are some descritions for these configuration options:
```
{
  // Should this report only show locale entries that are missing?
  "showMissingOnly": false,

  // Which locales should be analyzed?
  "localesToUse": ["default", "de", "es", "fr", "it"],

   // Within a cartridge, what is the path to the locale files?
  "templateDir": "/cartridge/templates/resources/",

  // What file prefix is shared across all cartridges?
  "cartridgtePrefix": "/full/path/to/repository/",

  // A list of the cartridges to analyze
  "cartridges": [
    "/full/path/to/repository/cartridges/app_foo_bar",
    "/full/path/to/repository/cartridges/app_foo_core",
    "/full/path/to/repository/cartridges/int_foobar",
    "/full/path/to/repository/cartridges/int_some_int",
    "/full/path/to/repository/dependencies/sitegenesis-community/app_storefront_core"
  ]
}
```
/* global module */

module.exports = 
{
    "env": 
	{
        "browser": true,
        "es2021": true,
		"webextensions": true,
    },
    "extends": "eslint:recommended",
    "overrides": 
	[
    ],
    "parserOptions": 
	{
        "ecmaVersion": "latest"
    },
    "rules": 
	{
		"no-unused-vars": "off",
		"no-debugger": "off",
		"no-inline-styles": "off",
    }
}

<!--- Provide a general summary of your changes in the Title above -->
Added support for additional tag references
  -Array Elements
  -Integer Bits (Bit Index) (writing a bit index required addition of READ_MODIFY_WRITE_TAG service)
Added support for program name prefix for tags (in additional to current method of passing program name separately)
Updated tagname validation
Fixed bug for reading BOOL


### Description, Motivation, and Context
<!--- Describe your changes in detail -->
<!--- Why is this change required? What problem does it solve? -->
Some atomic tag names were not able used
  -Array Elements
  -Integer Bits (Bit Index) 
Program name tag prefixes allows the creation of program scope tags with a single string
Prevous tag name validation wouldn't pass new tag names and would pass other invalid tag names
BOOL tags always returned false the value was checked against 0x01 instead of 0xff

## How Has This Been Tested?
<!--- Please describe in detail how you tested your changes. -->
<!--- Include details of your testing environment, and the tests you ran to -->
<!--- see how your change affects other areas of the code, etc. -->
Tested reading/writing
  -tested different read/write methods
    -individual
    -group
    -scan
  -tested tags:
    -BOOL, SINT, INT, DINT, REAL
    -INT[x], SINT[x], DINT[x], DINT[x,x], DINT[x,x,x]
    -SINT.0-7, INT.0-15, DINT.0-31
    -DINT[x].x
    -Tag.DINTmember[x]
    -Tag.DINTmember.x
    -Tag.DINTmember[x].x
  -visually inspected IOI paths for various tags and checked them against the manuals

Tested reading/writing tags with both methods of creating program tags
  -pass program as value
  -prefix program to tag name

Tested new tag name validation
  -tested new regex extensively regex101.com as well as adding new tagname tests to tag.spec.js
  -tested new tag/member length validation and added tests to tagspec.js

## Screenshots (if appropriate):

## Types of changes
<!--- What types of changes does your code introduce? Put an `x` in all the boxes that apply: -->
- [x] Bug fix (non-breaking change which fixes an issue)
- [x] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)

## Checklist:
<!--- Go over all the following points, and put an `x` in all the boxes that apply. -->
<!--- If you're unsure about any of these, don't hesitate to ask. We're here to help! -->
- [x] My code follows the code style of this project.
- [x] My change requires a change to the documentation.
- [x] I have updated the documentation accordingly.
- [x] I have read the **CONTRIBUTING** document.
- [x] I have added tests to cover my changes.
- [x] All new and existing tests passed.
- [ ] This is a work in progress, and I want some feedback (If yes, please mark it in the title -> e.g. `[WIP] Some awesome PR title`)

## Related Issue
<!--- This project only accepts pull requests related to open issues -->
<!--- If suggesting a new feature or change, please discuss it in an issue first -->
<!--- If fixing a bug, there should be an issue describing it with steps to reproduce -->
<!--- Please link to the issue here: -->

# Language Filter (`nodebb-plugin-language-filter`)

_This is one of 3 locations where this plugin is publically available. The other 2 are [Codeberg](https://codeberg.org/Crakila/nodebb-plugin-language-filter) and on [crk.ie](<https://crk.ie/nodebb-plugin-language-filter/>)_

This plugin allows admins to restrict the ability for Topics and Posts to specific languages.
This affects all future posts but not retroactively. This will also affect Fediverse posts. 

## Install

```
npm i nodebb-plugin-language-filter
```
then run `./nodebb build && ./nodebb restart` 

## Description

There will be rules in place to determine if a post is accepted or declined.
This will depend on what language(s) you have selected. 

The following are the rules set out on [Caint.ie](https://caint.ie) where this plugin was initially created for.

> A post will be ALLOWED if:
> 
> * Meets the NodeBB minimium character count (This happens natively)
> * The language cannot be determined (returns `und`)
> * The detected language is English (`eng`)
> * The detected language is Irish (`gle`)
> * (Additional languages that can been selected)
> 
> A post will be BLOCKED if:
> 
> * The text is above the minimum character count, AND
> * The language can be determined, AND
> * The detected language is anything other than English or Irish (or whatever language has been selected)
> 
> Additional things worth knowing:
> 
> * HTML tags are stripped before detection, so formatting does not affect the result
> * Detection is based on the post content for replies, and the content or title for new topics
> * The language detection is statistical – very short posts that scrape over the minimum character count may occasionally be misidentified.
> * Mixed language posts will be judged on whichever language dominates the text
> * Posts where the language genuinely cannot be determined are always let through rather than risk blocking legitimate English content
> * Usernames and URL's are ignored.

## Notable Changes since inital release: 

### 1.1.3
* URL's are ignored from the language filter check.

### 1.1.2 
* Usernames (including Fediverse handles) are ignored from the language filter check.

### 1.0.6
* Topic/Posts incoming from the Fediverse (ActivityPub) will be also be checked.

---

There is a 'More Info' section if you wish to post the above rules into a thread or a post and then link it in the error message (See front-end screenshot below) 
Just add a link in (See ACP screenshot) to the thread. It doesn't even have to be hosted on the same domain. 

## Screenshots
ACP:

<img width="659" height="882" alt="image" src="https://github.com/user-attachments/assets/bad29593-8ccb-4a6e-873f-2fad93265350" />

Front-end:

<img width="1832" height="720" alt="image" src="https://github.com/user-attachments/assets/c8e80bc6-85e4-4f48-95aa-e13063f51963" />


## Licence

Licence: WTFPL
See [LICENCE.md](LICENCE.md)



## Credits & Comment

This is my first plugin/script that I have created to _somewhat_ completion. 

I am not a developer, and even with the creation of this plugin, I do not claim to be.

The majority of this plugin was created previously by Claude Sonnet 4.6, maintained and updated with ChatGPT 5.5 and this README was created entirely by my human hands. 

As of 1.1.0, this plugin is on NPM now - https://www.npmjs.com/package/nodebb-plugin-language-filter

A clone of this repo is avilable on [my Codeberg](<https://codeberg.org/Crakila/nodebb-plugin-language-filter>)

This plugin is using WTFPL for the licence. [NodeBB uses GPLv3](https://github.com/NodeBB/NodeBB/blob/master/LICENSE) - Show them some love <3 

PR's are welcome and appreciated. 
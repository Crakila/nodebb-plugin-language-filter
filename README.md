# Language Filter 

This plugin allows admins to restrict the ability for Topics and Posts to specific languages.
This affects all future posts and but not retroactively. This will also affect Fediverse posts. 

## Install

```
npm install github:Crakila/nodebb-plugin-language-filter
```
then run `./nodebb build && ./nodebb restart` 

(I am not confident in publishing this to npm just yet. More info why towards the bottom of this README.md)

## Description

There will be rules in place to determine if a post is accepted or declined.
This will depend on what language(s) you have selected. 

The following are the rules set out on [Caint.ie](https://caint.ie) where this plugin was initially created for.

The minimum character is for the language detection only. It must be greater than or equal to the minimum post length found in `/admin/settings/posts`

> A post will be ALLOWED if:
> 
> * The text is shorter than 10 characters
> * The language cannot be determined (returns `und`)
> * The detected language is English (`eng`)
> * The detected language is Irish (`gle`)
> * (Additional languages that can been selected)
> 
> A post will be BLOCKED if:
> 
> * The text is 10 characters or longer, AND
> * The language can be determined, AND
> * The detected language is anything other than English or Irish (or whatever language has been selected)
> 
> Additional things worth knowing:
> 
> * HTML tags are stripped before detection, so formatting does not affect the result
> * Detection is based on the post content for replies, and the content or title for new topics
> * The language detection is statistical – very short posts that scrape over the 10 character minimum may occasionally be misidentified
> * Mixed language posts will be judged on whichever language dominates the text
> * Posts where the language genuinely cannot be determined are always let through rather than risk blocking legitimate English content

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

The majority of this plugin was created by Claude Sonnet 4.6 and this README was created entirely by my human hands. 

Since this is the first time that I have used AI to create something, I am not confident in uploading it to NPM, so I am keeping it to GitHub for now. It will be cloned over to [my Codeberg](<https://codeberg.org/Crakila>) if you prefer using that.

With that in mind, This plugin is using WTFPL for the licence. [NodeBB uses GPLv3](https://github.com/NodeBB/NodeBB/blob/master/LICENSE) - Show them some love <3 
PR's are welcome and appreciated. 

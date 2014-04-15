This is a fork of Kai Jäger's Scribblet bookmarklet program (http://scribblet.org)
specifically for iPhone and iPad devices.

To use, create a bookmark with the following URL content:

```text
javascript:void((function()%7Bvar%20e=document.createElement('script');e.setAttribute('type','text/javascript');e.setAttribute('charset','UTF-8');e.setAttribute('src','http://agentzh.org/misc/bookmark/scribblet.js?r='+Math.random()*999999999);document.body.appendChild(e)%7D)());
```


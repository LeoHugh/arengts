# arengts

## run demos
### Install Node.js 
visit https://nodejs.org/zh-cn/download

### Install dependencies

```
npm install lucide-react clsx tailwind-merge
```

### Run 

```
npm run dev
```

### swith to your API

See line 274-290 in three-kingdoms-reforged/src/App.tsx

``` js
      const response = await fetch(
        "https://open.bigmodel.cn/api/paas/v4/chat/completions",
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "glm-4.7",
            messages: messages,
            temperature: 1.0,
            stream: false
          }),
          signal: abortControllerRef.current.signal
        }
      );
```

Swith to your own API format (url/headers/apiKey e.t.c.). 


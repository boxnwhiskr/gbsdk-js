# GreedyBandit SDK for Javascript

[![Build Status](https://travis-ci.org/boxnwhiskr/gbsdk-js.svg?branch=master)](https://travis-ci.org/boxnwhiskr/gbsdk-js)
[![Coverage Status](https://coveralls.io/repos/github/boxnwhiskr/gbsdk-js/badge.svg?branch=master)](https://coveralls.io/github/boxnwhiskr/gbsdk-js?branch=master)

GreedyBandit is a cloud-based A/B testing and optimization engine developed by Box and Whisker. **GreedyBandit SDK for Javascript** is a small script lets you connect your website with GreedyBandit service with minimal effort.

## How to use

You need to create GreedyBandit account and configure new service to get the
`public_token` for your service. Consult [GreebyBandit service's command-line
interface manual](https://github.com/boxnwhiskr/gbscli) if you haven't created
the account.

Using the obtained `public_token`, add following code snippet to every page of
your site:

```html
<script type="text/javascript" src="//unpkg.com/gbsdk@0.3.0"></script>
<script>
    const gb = new gbsdk.GreedyBandit('YOUR_PUBLIC_TOKEN', {});
    gb.postLog();
</script>
```

For pages containing one or more experiments, add the following code in
addition to the code above:

```javascript
gb.getAssigns(function(assigns) {
    const value = assigns.value('YOUR_EXP_ID', 'YOUR_VARIABLE_ID');
    if(value === 'YOUR_VALUE_A') {
        // The user is assigned to YOUR_VALUE_A.
        // Do something here to provide YOUR_VALUE_A related experience.
    } else if(value === 'YOUR_VALUE_B') {
        // The user is assigned to YOUR_VALUE_B.
        // Do something here to provide YOUR_VALUE_B related experience.
    } else /* if value === '_DEFAULT' */ {
        // The user is assigned to the default version.
        // Usually you don't want to do something here.
    }
});
```

## Development

Setting up environment:

    npm i

Unit testing:

    npm run test

Or the following for the watch mode:

    npm run test:watch

To build:

    npm run build

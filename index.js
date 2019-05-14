const rfr = require('rfr');
const rp = require('request-promise');
const $ = require('cheerio');
const models = rfr('db/models/models');
const puppeteer = require('puppeteer');

const urlArr = [
  /* 'https://eshops.mercadolibre.cl/ELITE+PERFUMES',
  'https://eshops.mercadolibre.cl/FERNAPET',
  'https://vestuario.mercadolibre.cl/calzados/mujer/zapatos/zapato-de-mujer_DisplayType_LF',
  'https://listado.mercadolibre.cl/salud-belleza/perfumes-fragancias/mujer/perfume-de-mujer_DisplayType_LF' */
  'https://listado.mercadolibre.cl/salud-belleza/perfumes-fragancias/mujer/perfume-de-mujer_DisplayType_G',
  'https://twitter.com/'
];

const getUrlList = async (url, origin, category = null) => {
  try {
    let list = [];
    const html = await rp(url);
    if (!$('div.ico.view-option-stack', html).hasClass('selected')) {
      const _url = $('div.ico.view-option-stack', html).parent().attr('href');
      console.log(`Trying to get list view with url: ${_url}`);
      return getUrlList(_url, origin, category);
    }
    for (const item of $('ol#searchResults li.results-item div.rowItem div.item__info-container div.item__info h2.item__title',
      html).toArray()) {
      list.push(
        {
          description: $('a', item).text(),
          url: $('a', item).attr('href'),
          origin,
          category
        });
    }
    let nextLink = $('li.andes-pagination__button.andes-pagination__button--next', html).toArray();
    nextLink = nextLink.filter(link => {
      return !$('', link).hasClass('andes-pagination__button--disabled');
    });
    const nextUrl = nextLink.length != 0 ? $('a', nextLink.pop()).attr('href') : null;
    console.log(list.length, nextUrl);
    return { list, nextUrl };
  } catch (error) {
    console.log(error);
    return { list: [], nextUrl: null };
  }
};

const waitDelay = (t) => {
  return new Promise((res, rej) => {
    setTimeout(() => {
      res(true);
    }, t);
  });
};

const processUrls = async () => {
  try {
    for (const _url of urlArr) {
      let res = { list: [], nextUrl: null };
      let url = _url;
      let cnt = 0;
      do {
        cnt += 1;
        res = await getUrlList(url, 'SelPrdList', 'Product');
        await models.url.saveList(res.list);
        url = res.nextUrl;
        await waitDelay(500);
      } while (url != null && res.list.length > 0 && cnt <= 3);
    }
  } catch (error) {
    console.log(error);
  }
};

processUrls();
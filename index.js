const rfr = require('rfr');
const rp = require('request-promise');
const fs = require('fs');
const $ = require('cheerio');
const models = rfr('db/models/models');
const puppeteer = require('puppeteer');
let browser = null;
const urlArr = [
  /* 'https://eshops.mercadolibre.cl/ELITE+PERFUMES',
  'https://eshops.mercadolibre.cl/FERNAPET',
  'https://twitter.com/',
  'https://vestuario.mercadolibre.cl/calzados/mujer/zapatos/zapato-de-mujer_DisplayType_LF',
  'https://listado.mercadolibre.cl/salud-belleza/perfumes-fragancias/mujer/perfume-de-mujer_DisplayType_G' */
];


const getUrlList = async (url, origin, category = null) => {
  try {
    let list = [];
    //const html = await rp(url);
    const html = await dynamicHtml(url);
    if (!$('div.ico.view-option-stack', html).hasClass('selected')) {
      const _url = $('div.ico.view-option-stack', html).parent().attr('href');
      console.log(`Trying to get list view with url: ${_url}`);
      return getUrlList(_url, origin, category);
    }
    if ($('', html).find('#id_condition a.qcat-truncate ').length > 0) {
      const conditions = $('', html).find('#id_condition a.qcat-truncate ').toArray().filter(tag => {
        return $('', tag).attr('title').toLowerCase() == 'Nuevo'.toLowerCase();
      });
      if (conditions > 0) {
        const _url = $(conditions[0], '').attr('href');
        console.log(`Trying to get list of new products with url: ${_url}`);
        return getUrlList(_url, origin, category);
      }
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

const getProductsList = async (_url) => {
  const url = _url.url;
  const origin = _url.origin;
  const category = 'Product';
  try {
    let list = [];
    const html = await dynamicHtml(url);
    if (!$('div.ico.view-option-stack', html).hasClass('selected')) {
      const _url = $('div.ico.view-option-stack', html).parent().attr('href');
      console.log(`Trying to get list view with url: ${_url}`);
      return getUrlList(_url, origin, category);
    }
    if ($('', html).find('#id_condition a.qcat-truncate ').length > 0) {
      const conditions = $('', html).find('#id_condition a.qcat-truncate').toArray().filter(tag => {
        return $('', tag).attr('title').toLowerCase() == 'Nuevo'.toLowerCase();
      });
      if (conditions > 0) {
        const _url = $(conditions[0], '').attr('href');
        console.log(`Trying to get list of new products with url: ${_url}`);
        return getUrlList(_url, origin, category);
      }
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
    //const nextUrl = nextLink.length != 0 ? $('a', nextLink.pop()).attr('href') : null;
    if (nextLink.length != 0) {
      list.push({
        description: `${url} next page`,
        url: $('a', nextLink.pop()).attr('href'),
        origin,
        category: 'List'
      });
    }
    console.log(list.length);
    await models.url.saveList(list);
    return { list };
  } catch (error) {
    console.log(error);
    return { list: [] };
  }
};

const getProductHtml = async (_url) => {

  const url = _url.url;
  const description = _url.description;
  const html = await dynamicHtml(url);
  const filename = `Product${_url.id}.html`;
  fs.writeFile(`./docs/${filename}`, html, (err) => console.error(err));
  let list = [{
    description: `${description} Seller`,
    url: $('.reputation-view-more', html).attr('href'),
    origin: 'PDP',
    category: 'Seller'
  }];
  await models.url.saveList(list);
  //TODO Save on a Relational Table to track file against product description
};

const getSellerHtml = async (_url) => {
  const url = _url.url;
  const html = await dynamicHtml(url);
  const filename = `Seller${_url.id}.html`;
  fs.writeFile(`./docs/${filename}`, html, (err) => console.error(err));
};

const waitDelay = (t) => {
  return new Promise((res, rej) => {
    setTimeout(() => {
      res(true);
    }, t);
  });
};

const dynamicHtml = async (url) => {
  if (browser == null) {
    browser = await puppeteer.launch({ headless: true });
  }
  let page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setRequestInterception(true);

  page.on('request', (req) => {
    if (req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image') {
      req.abort();
    } else {
      req.continue();
    }
  });
  await page.goto(url);
  const html = await page.content();
  await page.close();
  return html;
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
        await waitDelay(500); //Time to simulate human interaction
      } while (url != null && res.list.length > 0 && cnt <= 3);
    }
  } catch (error) {
    console.log(error);
  }
};

const attempt = async () => {
  //TODO Get parameters from DB
  const parameters = {
    attempts: 2,
    period: 60
  };
  const delay = parameters.period * 1000 / (parameters.attempts + 1);
  //TODO Get list from DB
  const list = await models.url.getNonChecked(parameters.attempts);/* [
    {
      description: `accesorios-celulares Category`,
      url: 'https://listado.mercadolibre.cl/celulares-telefonia/accesorios-celulares/#menu=categories',
      origin: 'Category',
      category : 'List'
    },
    {
      description: `Xiaomi Mi Band 3 (reloj Inteligente) - Xiaomi Chile`,
      url: 'https://articulo.mercadolibre.cl/MLC-474261119-xiaomi-mi-band-3-reloj-inteligente-xiaomi-chile-_JM?quantity=1',
      origin: 'Category List',
      category : 'Product'
    }
  ]; */

  for (const url of list) {
    await waitDelay(delay);
    if (url.category == 'List') {
      await getProductsList(url);
    } else if (url.category == 'Product') {
      await getProductHtml(url);
    } else if (url.category == 'Seller') {
      await getSellerHtml(url);
    } else {
      console.error(`${url.category} is not a known reading method`);
    }
    await models.url.urlChecked(url.id);
  }

  //TODO Recalculate next attempts per period
  process.exit(1);
};

attempt();
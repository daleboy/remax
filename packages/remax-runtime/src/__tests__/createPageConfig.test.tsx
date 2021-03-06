import * as React from 'react';
import { createPageConfig, createAppConfig, usePageEvent } from '../../src';
import { useQuery } from '../hooks';
import { resetPageId } from '../createPageConfig';
import Page from './helpers/Page';

jest.mock('../stopPullDownRefresh', () => () => void 0);

const ALL_EVENTS_PAGE = 'pages/test/index';
const ONLY_ON_SHOW_PAGE = 'pages/test/only/onshow';

describe('page query hook', () => {
  beforeEach(() => {
    // mock mini program getApp api
    const app = createAppConfig(undefined);
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    global.getApp = () => app;
  });

  afterEach(() => {
    resetPageId();
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    global.getApp = undefined;
  });

  it('useQuery will get the query from onLoad', () => {
    function Page<T>(config: T) {
      return Object.assign(config, {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        setData() {},
      });
    }
    const pageQuery = { id: 1 };
    let receivedQuery: any;
    const TestPage = () => {
      const query = useQuery();
      receivedQuery = query;
      return <div>{query.id}</div>;
    };
    const page = Page(createPageConfig(TestPage, ALL_EVENTS_PAGE));
    page.onLoad(pageQuery);
    expect(receivedQuery).toBe(pageQuery);
    expect(receivedQuery.id).toBe(1);
    page.onUnload();
  });

  it('create page id for each page instance', () => {
    const TestPage = () => {
      return <div>hello</div>;
    };
    const page1 = Page(createPageConfig(TestPage, ALL_EVENTS_PAGE));
    const page2 = Page(createPageConfig(TestPage, ALL_EVENTS_PAGE));
    page1.load();
    page2.load();
    expect(page1.config.pageId).toBe('page_0');
    expect(page2.config.pageId).toBe('page_1');
  });

  it('onPullDownRefresh can handle promise returned by callback', done => {
    const TestPage = () => {
      usePageEvent('onPullDownRefresh', () => {
        return new Promise(resolve => {
          resolve();
          done();
        });
      });
      return <div />;
    };

    const page = Page(createPageConfig(TestPage, ALL_EVENTS_PAGE));

    page.load();
    page.pullDownRefresh();
  });

  it('register event correctly', () => {
    const TestPage = () => {
      return <div />;
    };

    const page = Page(createPageConfig(TestPage, ONLY_ON_SHOW_PAGE));

    page.load();
    page.show();

    expect(() => {
      page.pullDownRefresh();
    }).toThrow();
  });
});

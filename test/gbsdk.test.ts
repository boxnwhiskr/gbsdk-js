import * as gbsdk from '../src/gbsdk'
import * as jsdom from 'jsdom'
import * as mockFetch from 'jest-fetch-mock'
import {Cookie} from "tough-cookie"


describe('GreedyBandit', () => {
  let gb: gbsdk.GreedyBandit

  beforeEach(() => {
    gb = new gbsdk.GreedyBandit('TOKEN', {prefetchAssigns: false})
  })

  it('should allow to omit an options object', () => {
    expect(gb.getSegs()).toEqual([])
    expect(gb.getUid()).toBeNull()
  })
})


describe('GreedyBandit TID', () => {
  let dom: jsdom.JSDOM
  let gb: gbsdk.GreedyBandit

  beforeEach(() => {
    gbsdk.Time.freeze()

    dom = getDOM()
    gb = getGreedyBandit(dom)
  })

  afterEach(() => {
    gbsdk.Time.reset()
  })

  it('should allow to omit an options object', () => {
    gb = new gbsdk.GreedyBandit('TOKEN', {prefetchAssigns: false})
  })

  it('should be saved to _gbtid cookie for the first-time visitor', () => {
    const gbtid = getCookie(dom, '_gbtid')
    expect(gbtid['value']).toMatch(/^[\w-_]{32}$/)
  })

  it('should be saved with expiration date', () => {
    const gbtid = getCookie(dom, '_gbtid')
    const expiration = gbsdk.Time.now()
    expiration.setDate(expiration.getDate() + 365 * 2)
    expect(new Date(gbtid['expires']).toUTCString()).toBe(expiration.toUTCString())
  })

  it('should not be touched if the user is a returning visitor', () => {
    const curValue = getCookie(dom, '_gbtid').value

    gbsdk.Time.tick()
    gb = getGreedyBandit(dom)
    const newValue = getCookie(dom, '_gbtid').value

    expect(curValue).toBe(newValue)
  })
})


describe('GreedyBandit.postLog()', () => {
  let dom: jsdom.JSDOM
  let fetch: any

  beforeEach(() => {
    dom = getDOM()
    fetch = injectMockFetch(dom)
  })

  it('should call API', () => {
    const gb = getGreedyBandit(dom)
    const sent = gb.postLog()
    const expectedReq = [
      'https://api.greedybandit.com/logs',
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json; charset=utf-8'},
        body: JSON.stringify(sent)
      }]
    expect(fetch.mock.calls).toEqual([expectedReq])
  })

  it('should populate default params', () => {
    const gb = getGreedyBandit(dom)
    const sent = gb.postLog()
    expect(sent).toEqual({
      '_t': 'TOKEN',
      '_tid': gb.getTid(),
      '_url': 'http://x.com/index?q=1',
    })
  })

  it('should send _uid if user id is provided', () => {
    const gb = getGreedyBandit(dom, {uid: 'alan'})
    const sent = gb.postLog()
    expect(sent).toEqual({
      '_t': 'TOKEN',
      '_tid': gb.getTid(),
      '_uid': gb.getUid(),
      '_url': 'http://x.com/index?q=1',
    })
  })

  it('should allow custom params', () => {
    const gb = getGreedyBandit(dom)
    const sent = gb.postLog({'_url': 'http://x.com/hello', 'level': '3'})
    expect(sent).toEqual({
      '_t': 'TOKEN',
      '_tid': gb.getTid(),
      '_url': 'http://x.com/hello',
      'level': '3',
    })
  })
})


describe('GreedyBandit.getAssigns()', () => {
  let dom: jsdom.JSDOM
  let fetch: any

  beforeEach(() => {
    dom = getDOM()
    fetch = injectMockFetch(dom)
  })

  it('should call API', done => {
    const response = [
      {
        'exp_id': 'e0',
        'values': {'v0': 'a'},
        'expire_dt': 'Sat, 6 Apr 2019 00:01:02 GMT'
      },
      {
        'exp_id': 'e1',
        'values': {'v1': 'b'},
        'expire_dt': 'Sat, 6 Apr 2019 01:02:03 GMT'
      },
    ]
    fetch.mockResponseOnce(JSON.stringify(response))

    const gb = getGreedyBandit(dom)
    gb.getAssigns(actual => {
      expect(actual.getAssigns()).toEqual([
        {
          'expId': 'e0',
          'values': {'v0': 'a'},
          'expireDt': new Date(Date.UTC(2019, 3, 6, 0, 1, 2, 0))
        },
        {
          'expId': 'e1',
          'values': {'v1': 'b'},
          'expireDt': new Date(Date.UTC(2019, 3, 6, 1, 2, 3, 0))
        },
      ])
      done()
    })

    const expectedReq = [
      `https://api.greedybandit.com/assignments?` +
      `public_token=TOKEN&tid=${gb.getTid()}`,
      {
        method: 'GET',
        headers: {'Content-Type': 'application/json; charset=utf-8'},
      }
    ]
    expect(fetch.mock.calls).toEqual([expectedReq])
  })

  it('should send uid if available', done => {
    fetch.mockResponseOnce(JSON.stringify([]))

    const gb = getGreedyBandit(dom, {uid: 'alan'})
    gb.getAssigns(actual => {
      expect(actual.getAssigns()).toEqual([])
      done()
    })

    const expectedReq = [
      `https://api.greedybandit.com/assignments?` +
      `public_token=TOKEN&tid=${gb.getTid()}&uid=alan`,
      {
        method: 'GET',
        headers: {'Content-Type': 'application/json; charset=utf-8'},
      }
    ]
    expect(fetch.mock.calls).toEqual([expectedReq])
  })

  it('should allow to set user segments', () => {
    const gb = getGreedyBandit(dom, {segs: ['20s', 'f']})
    expect(gb.getSegs()).toEqual(['20s', 'f'])
  })

  it('should send segs if available', done => {
    fetch.mockResponseOnce(JSON.stringify([]))

    const gb = getGreedyBandit(dom, {segs: ['20s', 'f']})
    gb.getAssigns(actual => {
      expect(actual.getAssigns()).toEqual([])
      done()
    })

    const expectedReq = [
      `https://api.greedybandit.com/assignments?` +
      `public_token=TOKEN&tid=${gb.getTid()}&segs=20s,f`,
      {
        method: 'GET',
        headers: {'Content-Type': 'application/json; charset=utf-8'},
      }
    ]
    expect(fetch.mock.calls).toEqual([expectedReq])
  })

  it('should prefetch assignments on construction', () => {
    fetch.mockResponseOnce(JSON.stringify([]))

    const gb = new gbsdk.GreedyBandit('TOKEN', {window: dom.window})
    expect(gb).not.toBeNull()
    expect(fetch.mock.calls.length).toBe(1)
  })

  it('should return _DEFAULT if expId or varId does not match', done => {
    const response = [
      {
        'exp_id': 'e0',
        'values': {'v0': 'a'},
        'expire_dt': 'Sat, 6 Apr 2019 00:01:02 GMT'
      }
    ]
    fetch.mockResponseOnce(JSON.stringify(response))

    const gb = getGreedyBandit(dom)
    gb.getAssigns(actual => {
      expect(actual.value('e0', 'UNKNOWN')).toEqual('_DEFAULT')
      expect(actual.value('UNKNOWN', 'v0')).toEqual('_DEFAULT')
      done()
    })
  })

  it('should return _DEFAULT if network error occurs', done => {
    fetch.mockReject(new Error())

    const gb = getGreedyBandit(dom)
    gb.getAssigns(actual => {
      expect(actual.value('ANY', 'VALUE')).toEqual('_DEFAULT')
      done()
    })
  })
})


describe('Utils', () => {
  it('Time.now() should return current time if not frozen', () => {
    const expected = +new Date()
    const actual = +gbsdk.Time.now()
    expect(actual - expected).toBeLessThan(100)
  })

  it('Time.freeze() should freeze timer', () => {
    const date = new Date(2019, 1, 2, 3, 4, 5, 6)
    gbsdk.Time.freeze(date)
    expect(gbsdk.Time.now()).toBe(date)
  })

  it('Time.tick() should freeze if it is not frozen already', () => {
    gbsdk.Time.reset()
    gbsdk.Time.tick()
  })
})


function getCookie(dom: jsdom.JSDOM, key: string): Cookie.Serialized {
  const cookies = dom.cookieJar.toJSON().cookies
  return cookies.filter(c => c.key === key)[0]
}


function injectMockFetch(dom: jsdom.JSDOM) {
  const win: any = dom.window
  win.fetch = mockFetch
  win.fetch.resetMocks()
  return win.fetch
}


function getDOM(): jsdom.JSDOM {
  const dom = new jsdom.JSDOM('<html lang="en">', {url: 'http://x.com/index?q=1'})
  // @ts-ignore
  dom.window.console.log = () => {
    return
  }
  return dom
}


function getGreedyBandit(dom: jsdom.JSDOM, options?: any): gbsdk.GreedyBandit {
  return new gbsdk.GreedyBandit('TOKEN', {
    prefetchAssigns: false,
    window: dom.window,
    ...(options || {}),
  })
}

import 'es6-promise/auto'
import 'whatwg-fetch'


export class GreedyBandit {
  private readonly win: Window
  private readonly endpoint: string

  private readonly token: string
  private readonly tid: string
  private readonly uid: string | null
  private readonly segs: string[]

  constructor(token: string, options: Options) {
    this.win = options.window || window
    this.endpoint = options.endpoint || 'https://api.greedybandit.com'
    this.tid = options.tid || this.generateTid()
    this.uid = options.uid || null
    this.segs = options.segs || []

    this.token = token

    if (options.prefetchAssigns !== false) {
      this.getAssigns(() => {
        /* Prefetch to warm-up cache */
      })
    }
  }

  private generateTid(): string {
    let tid = this.getCookie('_gbtid')
    if (!tid) {
      tid = GreedyBandit.generateTid()
      const twoYears = 2 * 365 * 24 * 60 * 60 * 1000
      this.setCookie('_gbtid', tid, new Date(+Time.now() + twoYears))
    }
    return tid
  }

  private setCookie(key: string, value: string, expireAt: Date): void {
    this.win.document.cookie = `${key}=${value}; path=/; expires=${expireAt.toUTCString()}`
  }

  private getCookie(key: string): string | null {
    const pairs = this.win.document.cookie.split(';')
    for (let i = 0; i < pairs.length; i++) {
      const [k, v] = pairs[i].split('=')
      if (k.trim() === key) return v.trim()
    }
    return null
  }

  private static generateTid(): string {
    // generate random bytes
    const src = []
    for (let i = 0; i < 24; i++) src.push(Math.random() * 256 | 0)

    // make url-safe base64
    const b64 = btoa(String.fromCharCode(...src))
    return b64.replace(/\//g, '-').replace(/\+/g, '_')
  }

  postLog(log?: object): object {
    const populatedLog: any = {
      _t: this.token,
      _tid: this.getTid(),
      _url: this.win.location.href,
      ...(log || {}),
    }
    const userId = this.getUid()
    if (userId !== null) populatedLog['_uid'] = userId

    const url = `${this.endpoint}/ingester/logs`

    const win: any = this.win
    win.fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json; charset=utf-8'},
      body: JSON.stringify(populatedLog)
    }).then()

    return populatedLog
  }

  getTid(): string {
    return this.tid
  }

  getUid(): string | null {
    return this.uid
  }

  getSegs(): string[] {
    return [...this.segs].sort()
  }

  getAssigns(callback: (assign: SafeAssigns) => void): void {
    let qs = `public_token=${this.token}&tid=${this.tid}`
    if (this.getUid()) qs += `&uid=${this.getUid()}`
    if (this.getSegs().length) qs += `&segs=${this.getSegs()}`

    const url = `${this.endpoint}/assignments?${qs}`

    const win: any = this.win
    win
      .fetch(url, {
        method: 'GET',
        headers: {'Content-Type': 'application/json; charset=utf-8'},
      })
      .then((res: Response) => res.json())
      .then((assigns: any) => assigns.map((a: any) => ({
        expId: a['exp_id'],
        expireDt: new Date(a['expire_dt']),
        values: a['values']
      })))
      .then((assigns: Assign[]) => callback(new SafeAssigns(assigns)))
      .catch((e: any) => {
        this.win.console.log(e)
        callback(new SafeAssigns([]))
      })
  }
}


export type Options = {
  window?: Window,
  endpoint?: string,
  prefetchAssigns?: boolean,
  tid?: string,
  uid?: string,
  segs?: string[],
}


class SafeAssigns {
  private readonly assigns: Assign[]

  constructor(assigns: Assign[]) {
    this.assigns = assigns
  }

  getAssigns(): Assign[] {
    return this.assigns
  }

  value(expId: string, varId: string): string {
    const assign: Assign = this.assigns.filter(a => a.expId === expId)[0]
    if (!assign) return '_DEFAULT'
    return assign.values[varId] || '_DEFAULT'
  }
}


export type Assign = {
  expId: string,
  expireDt: Date,
  values: AssignValues
}


export type AssignValues = {
  [id: string]: string
}


export class Time {
  private static _preset: Date | null = null

  static now(): Date {
    return Time._preset || new Date()
  }

  static freeze(now?: Date) {
    Time._preset = now || new Date()
  }

  static reset() {
    Time._preset = null
  }

  static tick() {
    if (!Time._preset) Time.freeze()
    Time._preset = new Date(Time.now().getTime() + 1000)
  }
}

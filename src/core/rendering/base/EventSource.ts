type EventListener<T> = (params: T) => void;

export class EventSource<T extends { [key in keyof T]?: EventListener<T[key]> } = {}> {
  private readonly handlers: { [key in keyof T]?: EventListener<T[key]>[] };

  protected constructor() {
    this.handlers = {};
  }

  protected triggerEvent<TKey extends keyof T>(name: TKey, params: T[TKey]) {
    if (this.handlers[name]) {
      for (const h of this.handlers[name]) {
        h(params);
      }
    }
  }

  public addEventListener<TKey extends keyof T>(name: TKey, handler: EventListener<T[TKey]>) {
    if (!this.handlers[name]) {
      // @ts-ignore
      this.handlers[name] = [];
    }
    if (!this.handlers[name].includes(handler)) {
      this.handlers[name].push(handler);
    }
  }

  public removeEventListener<TKey extends keyof T>(name: TKey, handler: EventListener<T[TKey]>) {
    if (this.handlers[name]) {
      this.handlers[name].splice(this.handlers[name].indexOf(handler), 1);
    }
  }
}

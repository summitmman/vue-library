// Classes and interfaces
class Ref<T> {
  private _value: T;
  private _templates: HTMLElement[];
  private _dependencies: Set<Function>;

  constructor(localValue: T) {
    this._value = localValue;
    this._templates = [];
    this._dependencies = new Set();
  }

  public get value(): T {
    return this._value;
  }
  public set value(localValue: T) {
    this._value = localValue;
    this.updateTemplate();
    this._dependencies.forEach((dependency) => {
      dependency();
    });
  }

  private updateTemplate(): void {
    this._templates.forEach((template) => {
      template.innerHTML = String(this._value);
    });
  }
  public setTemplates(templates: HTMLElement[]): void {
    this._templates = templates;
    this.updateTemplate();
  }
  public addDependency(dependencyFn: Function): void {
    this._dependencies.add(dependencyFn);
  }
}
class ComputedRef<T> extends Ref<T> {
  private _effect: () => T;
  private _dependency: () => void;

  constructor(effect: () => T) {
    super(effect());
    this._effect = effect;
    this._dependency = (): void => {
      this.value = this._effect();
    };
  }

  public get effect(): () => T {
    return this._effect;
  }

  public get dependency(): () => void {
    return this._dependency;
  }
}
interface Component {
  template: string;
  setup: () => any;
}

// Framework globals
const allRefs = new Map<string, Ref<any>>();

// Mount util methods
// Register ref variable
const registerRef = (key: string, localRef: Ref<any>): void => {
  localRef.setTemplates(Array.from(document.getElementsByName(key) || []));
  allRefs.set(key, localRef);
};
// Register computed variable
const registerComputedRef = (
  key: string,
  localComputedRef: ComputedRef<any>
): void => {
  const functionString = localComputedRef.effect.toString();
  const regexp = new RegExp(/(\S+)\.value/, 'gm');
  const allRefVariables = functionString.match(regexp);
  allRefVariables.forEach((item) => {
    const id = item.split('.')[0];
    const localRef = allRefs.get(id);
    if (localRef) {
      localRef.addDependency(localComputedRef.dependency);
    }
  });
  registerRef(key, localComputedRef);
};
// Bind events
const bindEvents = (key: string, bindingFn: Function): void => {
  const htmlElements = Array.from(document.getElementsByName(key));
  htmlElements.forEach((item) => {
    const attributeName = Array.from(item.attributes).find((attribute) => {
      return attribute.name.includes('@');
    });
    let eventName: string = 'click';
    if (attributeName) {
      eventName = attributeName.name.replace('@', '');
    }
    item.addEventListener(eventName as any, bindingFn as any);
  });
};
// Massage HTML template
const massageHTMLTemplate = (htmlString: string): string => {
  // 1. Massage template by replacing all reactives {{ }} with relevant name tags
  const regexp = new RegExp(/({{).+(}})/, 'gm');
  const allReactiveElements = htmlString.match(regexp);
  allReactiveElements.forEach((item) => {
    const variable = item.replace(/[{}]/gm, '').trim();
    htmlString = htmlString.replaceAll(
      item,
      `
        <span name="${variable}"></span>
      `
    );
  });

  // 2. Massage template by replacing all events @ with relevant name tags
  const eventRegexp = new RegExp(/@[a-zA-Z=\"]+/, 'gm');
  const allEventElements = htmlString.match(eventRegexp);
  allEventElements.forEach((item) => {
    const variableName = item.split('=')[1].replace(/\"/gm, '');
    htmlString = htmlString.replaceAll(item, `${item} name="${variableName}"`);
  });

  return htmlString;
};

// Reactive exports
const ref = <T>(value: T): Ref<T> => {
  const result: Ref<T> = new Ref<T>(value);
  return result;
};
const computed = <T>(callback: () => T): ComputedRef<T> => {
  const result: ComputedRef<T> = new ComputedRef<T>(callback);
  return result;
};
const mount = (baseDivId: string, appObj: Component): void => {
  // Handle template
  const htmlString = appObj.template;
  const massagedHTMLString = massageHTMLTemplate(htmlString);
  const app: HTMLElement = document.getElementById(baseDivId);
  app.innerHTML = massagedHTMLString;

  // Handle setup
  const componentReturns = appObj.setup();
  Object.keys(componentReturns).forEach((key) => {
    const item = componentReturns[key];
    if (item instanceof ComputedRef) {
      // Register ref variable
      registerComputedRef(key, item);
    } else if (item instanceof Ref) {
      // Register computed variable
      registerRef(key, item);
    } else if (item instanceof Function) {
      // Bind events
      bindEvents(key, item);
    }
  });
};

export { ref, computed, mount };

class BaseRef<T> {
  protected _value: T;
  protected _templates: HTMLElement[];
  protected _dependencies: Set<Function>;
  constructor(localValue: T) {
    this._value = localValue;
    this._templates = [];
    this._dependencies = new Set();
  }
  public get value(): T {
    return this._value;
  }
  protected setValue(localValue: T) {
    this._value = localValue;
    this.updateTemplate();
    this._dependencies.forEach((dependency) => {
      dependency();
    });
  }
  protected updateTemplate(): void {
    this._templates.forEach((template) => {
      template.innerHTML = String(this._value);
    });
  }
}
class SetupBaseRef<T> extends BaseRef<T> {
  public setTemplates(templates: HTMLElement[]): void {
    this._templates = templates;
    this.updateTemplate();
  }
  public addDependency(dependencyFn: Function): void {
    this._dependencies.add(dependencyFn);
  }
}
class Ref<T> extends BaseRef<T> {
  public set value(localValue: T) {
    this.setValue(localValue);
  }
}
class SetupRef<T> extends SetupBaseRef<T> {}

class SetupBaseComputedRef<T> extends SetupBaseRef<T> {
  private _effect: () => T;
  protected _dependency: () => void;
  constructor(effect: () => T) {
    super(effect());
    this._effect = effect;
    this._dependency = (): void => {
      this.setValue(this._effect());
    };
  }
  public get effect(): () => T {
    return this._effect;
  }
}
class SetupComputedRef<T> extends SetupBaseComputedRef<T> {
  public get dependency(): () => void {
    return this._dependency;
  }
}
class ComputedRef<T> extends SetupBaseComputedRef<T> {}
interface Component {
  template: string;
  setup: () => any;
}

const allRefs = new Map<string, SetupRef<any>>();

const ref = <T>(value: T): Ref<T> => {
  const result: Ref<T> = new Ref<T>(value);
  return result;
};
const computed = <T>(callback: () => T): ComputedRef<T> => {
  const result: ComputedRef<T> = new ComputedRef<T>(callback);
  return result;
};
const handleRefSetup = (key: string, localRef: SetupRef<any>): void => {
  localRef.setTemplates(Array.from(document.getElementsByName(key) || []));
  allRefs.set(key, localRef);
};
const handleComputedRefSetup = (
  key: string,
  localComputedRef: SetupComputedRef<any>
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
  handleRefSetup(key, localComputedRef);
};
const mount = (baseDivId: string, appObj: Component): void => {
  // Handle template
  // 1. Massage template by replacing all reactives with relevant name tags
  let htmlString = appObj.template;
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
  // 2. Massage template by replacing all events with relevant name tags
  const eventRegexp = new RegExp(/@[a-zA-Z=\"]+/, 'gm');
  const allEventElements = htmlString.match(eventRegexp);
  allEventElements.forEach((item) => {
    const variableName = item.split('=')[1].replace(/\"/gm, '');
    htmlString = htmlString.replaceAll(item, `${item} name="${variableName}"`);
  });
  // 3. mount massaged html template
  const app: HTMLElement = document.getElementById(baseDivId);
  app.innerHTML = htmlString;

  // Handle setup
  const componentReturns = appObj.setup();
  Object.keys(componentReturns).forEach((key) => {
    if (componentReturns[key] instanceof ComputedRef) {
      handleComputedRefSetup(key, componentReturns[key]);
    } else if (componentReturns[key] instanceof Ref) {
      handleRefSetup(key, componentReturns[key]);
    } else if (componentReturns[key] instanceof Function) {
      const htmlElements = Array.from(document.getElementsByName(key));
      htmlElements.forEach((item) => {
        const attributeName = Array.from(item.attributes).find((attribute) => {
          return attribute.name.includes('@');
        });
        let eventName = 'click';
        if (attributeName) {
          eventName = attributeName.name.replace('@', '');
        }
        item.addEventListener(eventName, componentReturns[key]);
      });
    }
  });
};

export { ref, computed, mount };

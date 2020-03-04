import { SparkyFunction } from "./sparky.function";
import { reconciliate } from "./sparky.dom";
import { setAllEvents } from "./sparky.event";
import { EventManager } from "./sparky.eventmanager";

export interface IRenderReturn extends IReconciliateProps {
    type: string;
    children: ISparkyComponent[];
}

export interface IReconciliateProps {
    dom: HTMLElement,
    func: Function[],
}

export type ISelfFunction = (self: SparkyFunction) => IRenderReturn;

export interface ISparkyComponent {
    type: string;
    self: SparkyFunction;
    selfFn: ISelfFunction;
}

export class Sparky {
    private static currentDom: HTMLElement;
    public static _DEV_: boolean = true;

    /**
     * Generate a Sparky Component that can be mount.
     * @param renderFunc The function that going to be execute to render html template
     */
    static component(renderFunc: ISelfFunction) {
        const thisFunction = new SparkyFunction(renderFunc);
        return { type: "SparkyComponent", self: thisFunction, selfFn: renderFunc } as ISparkyComponent;
    }

    /**
     * Mount a Sparky Component in the DOM Tree and keep it updated.
     * @param component Sparky Component
     * @param dom The dom element where you want to mount this component
     */
    static mount(component: ISparkyComponent, dom?: HTMLElement) {
        if(this._DEV_)
            console.time();
        
        const { self, selfFn } = component;
        const render = selfFn.call(window, self) as IRenderReturn;
        render.children.forEach((child) => child.self.__parent = component);  
        render.dom = setAllEvents({dom: render.dom, func: render.func}, self);
              
        let finalDOM = reconciliate(this.currentDom, render.dom);           
        if (!finalDOM) return;
        if (!finalDOM.isConnected && dom)
            dom.appendChild(finalDOM);
        EventManager.listen();
        
        this.currentDom = finalDOM as HTMLElement;
        
        if(this._DEV_)
            console.timeEnd();
    }

    /**
     * Reconciliate the current DOM with the new DOM Node
     * @param oldNode Node that need to be reconcile
     * @param newNode Node that have the new elements
     */
    static reconciliate(oldNode: HTMLElement, newNode: HTMLElement) {
        return reconciliate(oldNode, newNode)
    }
}

/**
 * Render the html string template to HTML elements
 * @param html Array of HTML String 
 * @param computedProps Computed Props used to pass Javascript into template
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals
 */
export function render(html: TemplateStringsArray | string, ...computedProps: any[]): IRenderReturn {
    const domNode = document.createElement("div");
    const func: Function[] = [];
    const children: ISparkyComponent[] = [];

    const newHTML = (typeof html == "string") ? html
        : html.map((stringHTML, i) => {
            let htmlLine = ""
            htmlLine += stringHTML
            if(!computedProps[i]) return htmlLine;
            htmlLine = getComputedValue(computedProps, i, func, htmlLine, children);
            return htmlLine;
        })
        
    domNode.innerHTML = Array.isArray(newHTML) ? newHTML.join("") : newHTML;

    if(domNode.children.length > 1) {
        throw new TypeError("The render HTML can only had one root node");
    }

    return { type: "SparkyRender", dom: domNode.firstElementChild as HTMLElement, func, children };
}

function getComputedValue(computedProps: any[], i: number, func: Function[], htmlLine: string, children: ISparkyComponent[]) {
    if (typeof computedProps[i] == "function") {
        func.push(computedProps[i]);
        htmlLine += "'functionScoped'";
    }
    else if (computedProps[i].type && computedProps[i].type == "SparkyRender") {
        const render = computedProps[i] as IRenderReturn;
        htmlLine = renderSparkyObject(render, func, htmlLine);
    }
    else if (computedProps[i].type && computedProps[i].type == "SparkyComponent") {
        const comp = computedProps[i] as ISparkyComponent;
        const render = comp.selfFn.call(window, comp.self) as IRenderReturn;
        htmlLine = renderSparkyObject(render, func, htmlLine);
        children.push(comp);
    }
    else {
        computedProps[i] = new String(computedProps[i]);
        if ((computedProps[i] as string).startsWith("<"))
            htmlLine += computedProps[i];
        else
            htmlLine += `<span class='computed'>${computedProps[i]}</span>`;
    }
    return htmlLine;
}

function renderSparkyObject(render: IRenderReturn, func: Function[], htmlLine: string) {
    const div = document.createElement("div");
    div.appendChild(render.dom);
    func.push(...render.func);
    htmlLine += div.innerHTML;
    return htmlLine;
}

import { useEffect, useRef } from "react";
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";
import "tippy.js/animations/shift-away-subtle.css";

export default function useSystemTooltip(
    content,
    enabled = true,
    placement = "right",
) {
    const ref = useRef(null);

    useEffect(() => {
        if (!enabled || !content || !ref.current) return undefined;

        const instance = tippy(ref.current, {
            content,
            placement,
            theme: "hcc-system",
            animation: "shift-away-subtle",
            arrow: true,
            delay: [120, 0],
            duration: [220, 180],
            offset: [0, 10],
            appendTo: () => document.body,
        });

        return () => instance.destroy();
    }, [content, enabled, placement]);

    return ref;
}

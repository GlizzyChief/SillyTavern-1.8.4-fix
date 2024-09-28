import { callPopup, getRequestHeaders } from "../script.js";

export const SECRET_KEYS = {
    HORDE: "api_key_horde",
    OPENAI: "api_key_openai",
    POE: "api_key_poe",
    FLOWGPT: "api_key_flowgpt",
    VELLO_EMAIL: "api_vello_email",
    VELLO_PASSWORD: "api_vello_password",
    MISTRAL_COOKIE_NAME: "api_mistral_cookie_name",
    MISTRAL_COOKIE_VALUE: "api_mistral_cookie_value",
    NOVEL: "api_key_novel",
    CLAUDE: "api_key_claude",
    OPENROUTER: "api_key_openrouter",
};

const INPUT_MAP = {
    [SECRET_KEYS.HORDE]: "#horde_api_key",
    [SECRET_KEYS.OPENAI]: "#api_key_openai",
    [SECRET_KEYS.POE]: "#poe_token",
    [SECRET_KEYS.FLOWGPT]: "#flowgpt_token",
    [SECRET_KEYS.VELLO_EMAIL]: "#vello_email",
    [SECRET_KEYS.VELLO_PASSWORD]: "#vello_password",
    [SECRET_KEYS.MISTRAL_COOKIE_NAME]: "#mistral_cookie_name",
    [SECRET_KEYS.MISTRAL_COOKIE_VALUE]: "#mistral_cookie_value",
    [SECRET_KEYS.NOVEL]: "#api_key_novel",
    [SECRET_KEYS.CLAUDE]: "#api_key_claude",
    [SECRET_KEYS.OPENROUTER]: "#api_key_openrouter",
};

async function clearSecret() {
    const key = $(this).data("key");
    await writeSecret(key, "");
    secret_state[key] = false;
    updateSecretDisplay();
    $(INPUT_MAP[key]).val("");
    $("#main_api").trigger("change");
}

function updateSecretDisplay() {
    for (const [secret_key, input_selector] of Object.entries(INPUT_MAP)) {
        const validSecret = !!secret_state[secret_key];
        const placeholder = validSecret ? "✔️ Key saved" : "❌ Missing key";
        $(input_selector).attr("placeholder", placeholder);
    }
}

async function viewSecrets() {
    const response = await fetch("/viewsecrets", {
        method: "POST",
        headers: getRequestHeaders(),
    });

    if (response.status == 403) {
        callPopup(
            "<h3>Forbidden</h3><p>To view your API keys here, set the value of allowKeysExposure to true in config.conf file and restart the SillyTavern server.</p>",
            "text"
        );
        return;
    }

    if (!response.ok) {
        return;
    }

    $("#dialogue_popup").addClass("wide_dialogue_popup");
    const data = await response.json();
    const table = document.createElement("table");
    table.classList.add("responsiveTable");
    $(table).append("<thead><th>Key</th><th>Value</th></thead>");

    for (const [key, value] of Object.entries(data)) {
        $(table).append(
            `<tr><td>${DOMPurify.sanitize(key)}</td><td>${DOMPurify.sanitize(
                value
            )}</td></tr>`
        );
    }

    callPopup(table.outerHTML, "text");
}

export let secret_state = {};

export async function writeSecret(key, value) {
    try {
        const response = await fetch("/writesecret", {
            method: "POST",
            headers: getRequestHeaders(),
            body: JSON.stringify({ key, value }),
        });

        if (response.ok) {
            const text = await response.text();

            if (text == "ok") {
                secret_state[key] = true;
                updateSecretDisplay();
            }
        }
    } catch {
        console.error("Could not write secret value: ", key);
    }
}

export async function readSecretState() {
    try {
        const response = await fetch("/readsecretstate", {
            method: "POST",
            headers: getRequestHeaders(),
        });

        if (response.ok) {
            secret_state = await response.json();
            updateSecretDisplay();
            await checkOpenRouterAuth();
        }
    } catch {
        console.error("Could not read secrets file");
    }
}

function authorizeOpenRouter() {
    const openRouterUrl = `https://openrouter.ai/auth?callback_url=${encodeURIComponent(
        location.origin
    )}`;
    location.href = openRouterUrl;
}

async function checkOpenRouterAuth() {
    const params = new URLSearchParams(location.search);
    if (params.has("code")) {
        const code = params.get("code");
        try {
            const response = await fetch(
                "https://openrouter.ai/api/v1/auth/keys",
                {
                    method: "POST",
                    body: JSON.stringify({ code }),
                }
            );

            if (!response.ok) {
                throw new Error("OpenRouter exchange error");
            }

            const data = await response.json();
            if (!data || !data.key) {
                throw new Error("OpenRouter invalid response");
            }

            await writeSecret(SECRET_KEYS.OPENROUTER, data.key);

            if (secret_state[SECRET_KEYS.OPENROUTER]) {
                toastr.success("OpenRouter token saved");
                // Remove the code from the URL
                const currentUrl = window.location.href;
                const urlWithoutSearchParams = currentUrl.split("?")[0];
                window.history.pushState({}, "", urlWithoutSearchParams);
            } else {
                throw new Error("OpenRouter token not saved");
            }
        } catch (err) {
            toastr.error(
                "Could not verify OpenRouter token. Please try again."
            );
            return;
        }
    }
}

jQuery(async () => {
    $("#viewSecrets").on("click", viewSecrets);
    $(document).on("click", ".clear-api-key", clearSecret);
    $(document).on("input", Object.values(INPUT_MAP).join(","), function () {
        const id = $(this).attr("id");
        const value = $(this).val();
        const warningElement = $(`[data-for="${id}"]`);
        warningElement.toggle(value.length > 0);
    });
    $("#openrouter_authorize").on("click", authorizeOpenRouter);
});

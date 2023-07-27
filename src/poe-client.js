const { Builder, Browser, By, Key, until, Actions } = require('selenium-webdriver');
const { Options } = require('selenium-webdriver/firefox');
const { NodeHtmlMarkdown } = require('node-html-markdown');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));


class PoeClient {
    driver = null;
    botName = "ChatGPT";

    constructor(poeCookie, botName) {
        this.poeCookie = poeCookie;
        this.botName = botName;
    }


    async closeDriver() {
        await this.driver.close();
    }

    async initializeDriver() {

        let options = new Options();
        options.addArguments("--headless");

        this.driver = await new Builder().forBrowser(Browser.FIREFOX).setFirefoxOptions(options).build();
        await this.driver.get('https://poe.com');
        await this.driver.manage().addCookie({ name: 'p-b', value: this.poeCookie });
        await this.driver.get(`https://poe.com/${this.botName}`);

        /*if ((await this.driver.getTitle()) !== "Assistant - Poe") {
            console.log("Something wrong during initializing");
        }*/

        return true;
    }

    async getLatestMessage() {
        // this creates issues with jailbreak message being sent twise & the response of the second JB
        // getting taken as the response to the RP.
        // Until a fix is found, I suggest just throttling it slightly

        await delay(4000);
        let messages = await this.driver.findElements(By.xpath('//div[contains(@class, "Message_botMessageBubble__CPGMI")]'));
        let lastMessage = messages[messages.length - 1];

        if (lastMessage === "...") {
            return null;
        }

        return NodeHtmlMarkdown.translate(await lastMessage.getAttribute("innerHTML"));
    }

    async sendMessage(message) {
        try {

            //searching via classname raises errors from time to time for some reason
            let inputForm = await this.driver.findElement(By.css("textarea"));


            //If no error is raised all the way until here, then it means input field is ready for taking input.

            await this.driver.executeScript(`document.querySelector('textarea').value = \`${message}\``)

            await delay(20);

            await inputForm.sendKeys(Key.SPACE);
            await delay(5);
            await inputForm.sendKeys(Key.BACK_SPACE);

            await delay(20);

            await inputForm.sendKeys(Key.RETURN);
            await delay(5);

            let waitingForMessage = true;
            while (waitingForMessage) {
                let messages = await this.driver.findElements(By.xpath('//div[contains(@class, "Message_botMessageBubble__CPGMI")]'));

                if (messages.length === 0) {
                    await delay(1);
                    continue;
                }

                let latestMessage = messages[messages.length - 1].text;

                if (latestMessage === "...") {
                    await delay(1);
                    continue;
                }

                /* let abortButtons = await this.driver.findElements(By.className("ChatStopMessageButton_stopButton__LWNj6"));

                if (abortButtons.length === 0) {
                    await delay(1);
                    continue;
                } */

                waitingForMessage = false;

            }

            // In some cases, especially with smaller messages (e.g. jailbreak) it simply flies through without
            // being able to register that the message is already completed
            await delay(20)
            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    async abortMessage() {
        let stillGenerating = await this.isGenerating();
        if (!stillGenerating) return false;
        let abortButtons = await this.driver.findElements(By.className("ChatStopMessageButton_stopButton__LWNj6"));

        if(abortButtons.length === 0) return false;

        let abortButton = abortButtons[0];
        await abortButton.click();
        await delay(100);
        return true;
    }

    async clearContext() {
        let stillGenerating = await this.isGenerating();
        if(stillGenerating) await this.abortMessage();

        let clearButton = await this.driver.findElement(By.className("ChatBreakButton_button__EihE0"));
        await clearButton.click();

        return true;
    }

    async isGenerating() {
        
        // too fast for its own good, checks before stop button even appears, so
        // a bit of throttling fixes it
        await delay(150);
        let stopButtonElements = await this.driver.findElements(By.className("ChatStopMessageButton_stopButton__LWNj6"));
        return stopButtonElements.length > 0;
    }

    async getSuggestions() {
        await delay(5000);
        let suggestionContainers = await this.driver.findElements(By.className("ChatMessageSuggestedReplies_suggestedRepliesContainer__JgW12"));

        if (suggestionContainers.length === 0) {
            return []
        }

        let suggestions = [];

        let suggestionButtons = await suggestionContainers[0].findElements(By.css("button"));

        //console.log(suggestionButtons);

        for (let suggestionButton of suggestionButtons) {
            let suggestion = await suggestionButton.getText();
            suggestions.push(suggestion);
        }

        return suggestions;
    }

    // Not implemented currently
    async deleteLatestMessage() {
        let botMessages = await this.driver.findElements(By.xpath('//div[contains(@class, "Message_botMessageBubble__CPGMI")]'));
        let latestMessage = botMessages[botMessages.length - 1];


        //console.log(latestMessage);
    }

    async getBotNames() {
        let botNameContainers = await this.driver.findElements(By.className("BotHeader_title__q67To"));
        let names = [];

        for (let botNameContainer of botNameContainers) {
            let nameDiv = await botNameContainer.findElement(By.css("div"));
            let nameParagraph = await nameDiv.findElement(By.css("p"));
            let name = await nameParagraph.getAttribute("innerHTML");
            names.push(name);
        }

        return names;
    }



    // No error handling currently implemented for non-existing bots :/
    async changeBot(botName) {
        this.botName = botName;
        await this.driver.get(`https://poe.com/${this.botName}`);

        return true;
    }

}

module.exports = PoeClient;

import streamDeck, { LogLevel } from "@elgato/streamdeck";

import { TriggerAutomation } from "./actions/trigger-automation";

// Set appropriate logging level for production
streamDeck.logger.setLevel(LogLevel.ERROR);

// Register the actions.
streamDeck.actions.registerAction(new TriggerAutomation());

// Finally, connect to the Stream Deck.
streamDeck.connect();

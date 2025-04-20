// 📁 js/logic/promptBuilder.js

/**
 * Carica un file template e sostituisce le variabili {{...}}.
 * @param {string} templatePath - Percorso al file del template.
 * @param {Object} variables - Mappa { chiave: valore } da sostituire nel template.
 * @returns {Promise<string>} - Il prompt pronto da inviare a GPT.
 */
export async function buildPromptFromTemplate(templatePath, variables) {
    try {
      let template = await (await fetch(templatePath)).text();
  
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        template = template.split(placeholder).join(value);
      }
  
      return template;
    } catch (error) {
      console.error(`❌ Errore nel caricamento del template: ${templatePath}`, error);
      return "";
    }
  }
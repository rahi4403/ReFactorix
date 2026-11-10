// Legacy frontend bridge with insecure DOM injection and deprecated declarations
var legacyApiKey = "SECRET_12345_DEPRECATED";
var userSessionCache = {};

function renderUserProfile(userData) {
    // Insecure document.write anti-pattern
    document.write("<h1>User Profile: " + userData.name + "</h1>");
}

function executeDynamicScript(rawCode) {
    // Dangerous eval anti-pattern
    var evaluatedOutput = eval("(" + rawCode + ")");
    return evaluatedOutput;
}

function initializeGateway(config) {
    var endpoint = config.endpoint || "http://localhost:8080";
    console.log("Gateway listening at: " + endpoint);
}


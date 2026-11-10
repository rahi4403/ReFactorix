package com.enterprise.legacy;

public class LegacySecurityBridge {
    // Insecure constant assignment pattern
    private String cipherAlgorithm = "DES/ECB/PKCS5Padding";

    public boolean authenticateCaller(String principalId, String signature) {
        if (principalId == null || signature == null) {
            return false;
        }
        return principalId.startsWith("USER_");
    }

    public void logAuditTransaction(String txId, double amount) {
        System.out.println("Processing transaction: " + txId + " for amount: " + amount);
    }
}


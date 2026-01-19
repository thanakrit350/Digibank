package org.digio.checkthaiid.validate;

public class ValidateID {

    private ValidateID(){
        throw new IllegalArgumentException("Utility class");
    }

    public static boolean isValidThaiId(String id) {
        if (id == null || !id.matches("\\d{13}")) {
            return false;
        }

        int sum = 0;
        int weight = 13;

        for (int i = 0; i < 12; i++) {
            int digit = id.charAt(i) - '0';
            sum += digit * weight;
            weight--;
        }

        int mod = sum % 11;
        int checkDigit = (11 - mod) % 10;

        int lastDigit = id.charAt(12) - '0';

        return checkDigit == lastDigit;
    }

}

package org.digio.bank.dto;

import lombok.Data;

import java.time.Instant;

@Data
public class Register {

    private String memberId;
    private String username;
    private String password;
    private String pin;
    private String prefixTh;
    private String prefixEn;
    private String firstNameTh;
    private String lastNameTh;
    private String firstNameEn;
    private String lastNameEn;
    private String email;
    private String  birthDate;
    private String phoneNumber;

    private String houseNumber;
    private String soi;
    private String road;
    private String subDistrict;
    private String district;
    private String province;
    private String postalCode;
}


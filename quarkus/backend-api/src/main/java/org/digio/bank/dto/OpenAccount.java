package org.digio.bank.dto;

import lombok.Data;

@Data
public class OpenAccount {
    private Long memberId;
    private String pin;
}

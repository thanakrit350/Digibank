package org.digio.entity.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;


@Entity
@Table(name = "members")
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Member {

    @Id
    @Column(name = "member_id", length = 13, nullable = false)
    private String memberId;

    @Column(name = "username", length = 255, nullable = false)
    private String username;

    @Column(name = "password", length = 255, nullable = false)
    private String password;

    @Column(name = "pin", length = 100, nullable = false)
    private String pin;

    @Column(name = "prefix_th", length = 100, nullable = false)
    private String prefixTh;

    @Column(name = "prefix_en", length = 100, nullable = false)
    private String prefixEn;

    @Column(name = "first_name_th", length = 100, nullable = false)
    private String firstNameTh;

    @Column(name = "last_name_th", length = 100, nullable = false)
    private String lastNameTh;

    @Column(name = "first_name_en", length = 100, nullable = false)
    private String firstNameEn;

    @Column(name = "last_name_en", length = 100, nullable = false)
    private String lastNameEn;

    @Column(name = "email", length = 255, nullable = false, unique = true)
    private String email;

    @Column(name = "birth_date", nullable = false)
    private Instant birthDate;

    @Column(name = "phone_number", length = 13, nullable = false)
    private String phoneNumber;

    @OneToOne(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JoinColumn(name = "address_id")
    private Address address;
}

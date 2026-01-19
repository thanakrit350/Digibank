package org.digio.entitty.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "address")
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Address {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "address_id")
    private Integer addressId;

    @Column(name = "house_number", length = 100, nullable = false)
    private String houseNumber;

    @Column(name = "soi", length = 255)
    private String soi;

    @Column(name = "road", length = 255)
    private String road;

    @Column(name = "sub_district", length = 100, nullable = false)
    private String subDistrict;

    @Column(name = "district", length = 100, nullable = false)
    private String district;

    @Column(name = "province", length = 100, nullable = false)
    private String province;

    @Column(name = "postal_code", length = 5, nullable = false)
    private String postalCode;

}

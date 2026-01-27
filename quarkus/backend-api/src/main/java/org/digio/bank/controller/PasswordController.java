package org.digio.bank.controller;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.inject.Inject;

import jakarta.ws.rs.core.Response;
import org.digio.bank.dto.ResetPassword;
import org.digio.bank.service.PasswordResetService;

@Path("/password")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class PasswordController {

    private final PasswordResetService passwordResetService;

    @Inject
    public PasswordController(PasswordResetService passwordResetService) {
        this.passwordResetService = passwordResetService;
    }

    @POST
    @Path("/reset")
    public Response resetPassword(ResetPassword req) {
        try {
            passwordResetService.resetPasswordByEmail(req);
            return Response.ok(java.util.Map.of("message", "ตั้งรหัสผ่านใหม่สำเร็จ")).build();
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(java.util.Map.of("message", e.getMessage()))
                    .build();
        }
    }


}
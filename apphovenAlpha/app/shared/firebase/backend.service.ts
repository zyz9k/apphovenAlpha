import { Injectable } from "@angular/core";
import { getString, setString } from "application-settings";

const tokenKey = "token";
const email = "email";

export class BackendService {
  
  static isLoggedIn(): boolean {
    return !!getString("token"); // If token is null => false, if anything else => true
  }

  static get token(): string {
    return getString("token");
  }

  static set token(theToken: string) {
    setString("token", theToken);
  }

  static get email(): string {
    return getString("email");
  }

  static set email(email: string) {
    setString("email", email);
  }
}
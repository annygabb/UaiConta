import React, { useState } from "react";
import { CircleDollarSign, Loader2, LockKeyhole, Mail } from "lucide-react";
import { signIn, signUp } from "../dataService.js";

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError(""); setMessage(""); setLoading(true);
    try {
      if (mode === "login") {
        const session = await signIn(email.trim(), password);
        onAuthenticated(session);
      } else {
        const result = await signUp(email.trim(), password);
        if (result?.pendingConfirmation) setMessage("Conta criada. Confirme seu e-mail e depois entre no UaiConta.");
        else onAuthenticated(result);
      }
    } catch (err) {
      setError(err?.message || "Não foi possível autenticar.");
    } finally { setLoading(false); }
  }

  return <main className="auth-page"><section className="auth-visual"><div className="brand auth-brand"><span className="brand-mark"><CircleDollarSign size={20}/></span><span><strong>UaiConta</strong><small>Finance OS</small></span></div><div className="auth-orb"><div className="orbit orbit-a"/><div className="orbit orbit-b"/><div className="spatial-core"/></div><div><span className="eyebrow">Finanças sem ruído</span><h1>Transforme seus lançamentos em decisões claras.</h1><p>Um painel pessoal para entender receitas, gastos, investimentos e o que ainda pode sobrar.</p></div></section><section className="auth-card"><div><span className="eyebrow">{mode==="login"?"Bem-vinda de volta":"Comece agora"}</span><h2>{mode==="login"?"Entrar no UaiConta":"Criar sua conta"}</h2><p>{mode==="login"?"Acesse seus dados financeiros protegidos pelo seu usuário.":"Use um e-mail válido e uma senha com pelo menos 8 caracteres."}</p></div><form onSubmit={submit}><label><span>E-mail</span><div className="input-icon"><Mail size={16}/><input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required autoComplete="email"/></div></label><label><span>Senha</span><div className="input-icon"><LockKeyhole size={16}/><input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required minLength={8} autoComplete={mode==="login"?"current-password":"new-password"}/></div></label>{error&&<div className="inline-alert">{error}</div>}{message&&<div className="inline-success">{message}</div>}<button className="primary-btn auth-submit" disabled={loading}>{loading&&<Loader2 size={17} className="spin"/>}{mode==="login"?"Entrar":"Criar conta"}</button></form><button className="auth-switch" onClick={()=>setMode(mode==="login"?"signup":"login")}>{mode==="login"?"Ainda não tem conta? Criar conta":"Já tem conta? Entrar"}</button></section></main>;
}

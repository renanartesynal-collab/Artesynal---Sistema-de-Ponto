# App de Ponto

Sistema web estatico para registro de ponto com duas areas:

- Colaborador: bate o proprio ponto e solicita correcoes manuais.
- Coordenador: revisa registros, aprova/recusa correcoes, acompanha indicadores mensais e configura calendario/jornada.

## Como abrir

Use um servidor local na pasta do projeto:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Depois acesse `http://127.0.0.1:4173/`.

## Firebase

O app usa Firebase Auth e Firestore via CDN modular do Firebase.

Colecoes esperadas:

- `users/{uid}`
  - `name`: nome do usuario
  - `email`: email
  - `role`: `collaborator` ou `coordinator`
- `punches/{id}`
  - registros de ponto reais e manuais
- `holidays/{yyyy-mm-dd}`
  - feriados cadastrados pelo coordenador
- `settings/workSchedule`
  - dias e horarios de trabalho

Quando um usuario faz login pela primeira vez e nao existe em `users`, o app cria o perfil como `collaborator`. Para liberar a area de coordenador, altere o campo `role` para `coordinator` no Firestore.

## Jornada padrao

- Segunda a sexta
- Entrada: 08:00
- Saida: 18:00
- Intervalo: 12:00 as 13:30

## Observacoes

Os usuarios precisam existir no Firebase Authentication com email e senha. As regras do Firestore devem permitir que colaboradores leiam/escrevam seus proprios registros e que coordenadores gerenciem registros, usuarios, feriados e configuracoes.

## Login por arquivo

Tambem existe login local pelo arquivo:

`logins/logins.txt`

Preencha os blocos ja criados:

- 6 blocos de coordenadores.
- 10 blocos de colaboradores.

Campos usados:

- `email`: email de login
- `senha`: senha de login
- `nome`: nome exibido no sistema
- `funcao`: `coordinator` ou `collaborator`

Quando o email e a senha digitados no app batem com um bloco preenchido em `logins/logins.txt`, o sistema entra automaticamente com aquela funcao. Nesse modo local, os pontos, feriados e configuracoes ficam salvos no `localStorage` do navegador.

## Localizacao e lembrar login

Ao registrar entrada, pausa, fim de pausa ou saida, o app solicita permissao de localizacao, mostra uma previa do mapa e so grava o ponto depois da confirmacao.

O historico mostra o botao `Ver mapa` quando o ponto tem localizacao registrada. A previa usa OpenStreetMap e tenta obter o endereco por extenso via Nominatim.

Na tela de login, `Lembrar de mim` preenche email/senha na proxima abertura e, para login local por arquivo, mantem a sessao ativa ate o usuario clicar em `Sair`.

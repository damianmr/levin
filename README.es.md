# Levin Discord Bot

Levin es un bot que permite establecer un sistema de niveles para los usuarios utilizando roles de Discord. Los usuarios suben de nivel en base al tiempo de antiguedad que tengan en el servidor.

## Prerequesitos

Antes de comenzar a utilizar este proyecto, es necesario crear una nueva aplicacion en Discord, y agregarle a un bot a la misma. Esto se hace desde https://discordapp.com/developers/applications

{gif app creation}

Al finalizar la creación de la aplicación, aparecerá un `CLIENT_ID`, con el cual podremos unir el bot a cualquier Discord en el que se lo quiera instalar.

Luego es necesario agregar un bot en esta aplicación. Necesitaremos copiar y guardar, de manera segura, el token del bot. Este token es importantísimo, pues permite al bot conectarse a Discord.

{gif bot creation}

Nunca se debe subir el token a ningún archivo del repositorio y además debe permanecer secreto.

## Instalación
Solo se necesita instalar `nodejs` (https://nodejs.org/en/), luego:
```
npm install
```

## Ejecución
Es necesario unir el bot al Discord donde funcionará, para esto, se debe pedir a un administrador que acepte la solicitud del bot para ingresar. Esto se hace compartiendo con dicho administrador el siguiente link:

```
https://discordapp.com/oauth2/authorize?&client_id=CLIENT_ID_HERE&scope=bot&permissions=268435456
```

El `CLIENT_ID` fue generado durante la creación de la app. El número utilizado en el parametro `permissions` corresponde a los permisos que el bot necesita para funcionar correctamente.

La lista de permisos está disponible en la página de administración del bot:

{img permissions}

Usando el token generado durante la creación del bot, solo es necesario ejecutar.

```
LEVIN_TOKEN=<bot-token> npm start
```

Si todo está correctamente instalado, aparecerá un mensaje indicando que Levin se conectó a Discord.

## Configuración de la sala de Discord
En la Configuración de la sala, es necesario asegurarse de que el bot tenga la mayor autoridad posible en materia de roles. Y sobre todo, es importante que el bot este por encima de los roles que pretende asignar.

Por ejemplo, esta configuración no funcionará, dado que `[Levin Bot]` no va a poder remover o asignar los roles NVL1, NVL2, NVL3.

```
NVL1
NVL2
NVL3
[Levin Bot]
Coffee Maker
Snacks Provider
Gamers
Developers
```

Es necesario que la configuración luzca similar a esto:

```
[Levin Bot]
NVL1
NVL2
NVL3
Coffee Maker
Snacks Provider
Gamers
Developers
```

## Deployment
Cualquier servidor que pueda ejecutar aplicaciones NodeJS puede correr perfectamente Levin. Con el mismo comando que se utiliza localmente, ya que la app no requiere ningun paso de building.

Este repositorio en particular ofrece soporte para deployar en Heroku. Para utilizar Heroku solo es necesario crear una nueva aplicacion y configurar la variable de entorno `LEVIN_TOKEN` en las Settings de la app Heroku. El typo de CPU `free dyno` es suficiente.

## Recursos
* Lista de eventos disponibles: https://gist.github.com/koad/316b265a91d933fd1b62dddfcc3ff584
* Idem: https://github.com/onepiecehung/discordjs-logger
* Documentación general de DiscordJS (API usada en la comunicación con Discord): https://discordjs.guide/#before-you-begin
* DiscordJS API: https://discord.js.org/#/docs/main/stable/general/welcome
* Guía General de TypeScript: https://www.typescriptlang.org/docs/home.html
* Referencia de comandos CLI de Heroku: https://devcenter.heroku.com/articles/heroku-cli-commands
* Dyno Management en Heroku: https://devcenter.heroku.com/articles/dynos#cli-commands-for-dyno-management


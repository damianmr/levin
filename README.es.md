# Levin Discord Bot

Levin es un bot que permite establecer un sistema de niveles para los usuarios utilizando roles de Discord. Los usuarios suben de nivel en base al tiempo de antiguedad que tengan en el servidor.

## Prerrequesitos

Antes de comenzar a utilizar este proyecto, es necesario crear una nueva aplicacion en Discord, y agregarle a un bot a la misma. Esto se hace desde https://discordapp.com/developers/applications

![Crear una app en Discord](docs/app-create.gif?raw=true "Creando una app en Discord")

Al finalizar la creación de la aplicación, aparecerá un `CLIENT_ID`, con el cual podremos unir el bot a cualquier Discord en el que se lo quiera instalar.

Luego es necesario agregar un bot en esta aplicación. Necesitaremos copiar y guardar, de manera segura, el token del bot. Este token es importantísimo, pues permite al bot conectarse a Discord.

![Crear un bot en Discord](docs/bot-create.gif?raw=true "Creando un bot en Discord")

Nunca se debe subir el token a ningún archivo del repositorio y además debe permanecer secreto.

## Instalación
Solo se necesita instalar `nodejs` (https://nodejs.org/en/), luego:
```
npm install
```

## Ejecución
Es necesario unir el bot a la sala de Discord donde funcionará, para esto, se debe pedir a un administrador que acepte la solicitud del bot para ingresar.

Antes de todo, es necesario que el bot que creamos sea "Público", de otra manera, nadie podrá unirlo a su sala de Discord (los bots privados solo los puede unir su creador y solamente a aquellas salas de las que sea dueño).

![Estableciendo el bot como Público](docs/public-bot.jpg?raw=true "Estableciendo el bot como Público")

Luego se debe compartir este link con el administrador de la sala en la cual queremos que el bot se una:

```
https://discordapp.com/oauth2/authorize?&client_id=CLIENT_ID_HERE&scope=bot&permissions=268435456
```

El `CLIENT_ID` fue generado durante la creación de la app. El número utilizado en el parametro `permissions` corresponde a los permisos que el bot necesita para funcionar correctamente.

La lista de permisos está disponible en la página de administración del bot:

![Permisos en Discord](docs/permissions.jpg?raw=true "Permisos en Discord")

Usando el token generado durante la creación del bot, solo es necesario ejecutar.

```
LEVIN_TOKEN=<bot-token> UPGRADES_ENABLED=true AUTOMATIC_FIRST_LEVEL=true npm start
```

Si todo está correctamente instalado, aparecerá un mensaje indicando que Levin se conectó a Discord.

## Configuración de la sala de Discord
En la Configuración de la sala, es necesario asegurarse de que el bot tenga la mayor autoridad posible en materia de roles. **Y sobre todo, es importante que el bot este por encima de los roles que pretende asignar.**

Por ejemplo, esta configuración no funcionará, dado que `[Test Levin App]` no va a poder remover o asignar los roles NVL1, NVL2, NVL3.

![Mala configuración de roles](docs/wrong-setup.jpg?raw=true "Mala configuración de roles")

Es necesario que la configuración luzca similar a esto:

![Configuración correcta de roles](docs/correct-setup.jpg?raw=true "Configuración correcta de roles")

## Flags de configuración
* `LEVIN_TOKEN=<id>`: Es el token generado durante la creación del bot, sin el mismo es imposible conectarse al servicio de Discord. Es equivalente a un usuario y un password a la vez, no debe subirse a ningún repositorio y se le debe dar el mismo tratamiento que se le da a una contraseña de cualquier otro servicio.

* `UPGRADES_ENABLED`: Si no está definida (o su valor es algo distinto a `true`) los usuarios no van a subir de nivel. Se puede utilizar para deshabilitar temporalmente esta funcionalidad por cualquier motivo. Por defecto, los usuarios **no suben de nivel**, es necesario habilitar explicitamente esta configuración usando `UPGRADES_ENABLED=true`.

* `AUTOMATIC_FIRST_LEVEL`: Si no está definida (o su valor es algo distinto a `true`), el bot ignorará por completo a los usuarios que no posean al menos uno de los niveles pre-definidos. Si está activada, los usuarios que no posean ninguno de los niveles pre-definidos obtendrán automaticamente el primer nivel. Es útil deshabilitar esta funcionalidad cuando se desea limitar el acceso de nuevos miembros de manera que de no obtengan ningún nivel con el solo hecho de ingresar a la sala. Se le deberá asignar un rol de nivel manualmente a dicho usuario (o via cualquier otro bot o integración automática que esté disponible en la sala).

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


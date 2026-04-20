# Levin Discord Bot

English version: [README.md](README.md)

Levin es un bot que permite establecer un sistema de niveles para los usuarios utilizando roles de Discord. Los usuarios suben o bajan de nivel en base a su actividad. Los niveles determinan a qué canales pueden acceder estos usuarios.

## Prerrequisitos

### Creación del bot en Discord

Antes de comenzar a utilizar este proyecto, es necesario crear una nueva aplicación en Discord y agregarle un bot. Esto se hace desde https://discordapp.com/developers/applications

![Crear una app en Discord](docs/app-create.gif?raw=true "Creando una app en Discord")

Al finalizar la creación de la aplicación, aparecerá un `CLIENT_ID`, con el cual podremos unir el bot a cualquier Discord en el que se lo quiera instalar.

Luego es necesario agregar un bot en esta aplicación. Necesitaremos copiar y guardar, de manera segura, el token del bot. Este token es importantísimo, pues permite al bot conectarse a Discord.

![Crear un bot en Discord](docs/bot-create.gif?raw=true "Creando un bot en Discord")

Nunca se debe subir el token a ningún archivo del repositorio y además debe permanecer secreto.

### Persistencia de la base de datos

Levin utiliza una base de datos key-value super básica que se persiste en JSON. Por limitaciones de hardware y costos, la persistencia de esta base de datos se realiza a un archivo en git utilizando el [API oficial de GitHub con Octokit](https://octokit.github.io/rest.js/v17#usage). Por lo tanto, para utilizar esta API necesitaremos dos cosas:

1. Un repositorio nuevo y, en lo posible, dedicado a este fin exclusivamente, aunque no es obligatorio. Dicho repositorio debe contener tres archivos: `dev-db.json`, `stage-db.json`, `prod-db.json`. Se puede obtener un ejemplo de estos archivos en [dev-db.json.example](docs/dev-db.json.example?raw=true).

![Ejemplo de repositorio](docs/repoConfig.png?raw=true "Ejemplo de repositorio")

2. Un token de usuario que tenga acceso a dicho repositorio: esto se hace desde la interfaz de configuración del usuario. Este token no se debe compartir EN ABSOLUTO, ni subir al repositorio, y debe tratarse con la misma seguridad que cualquier otra contraseña.

![Creación de token de usuario](docs/userToken.gif?raw=true "Creación de token de usuario")

## Instalación

Solo se necesita instalar Node.js `v24.15.0` LTS. Si usás `nvm`, el repositorio incluye `.nvmrc`:

```bash
nvm install
nvm use
npm install
```

## Configuración del servidor de Discord

Antes de intentar ejecutar el bot, es necesario unirlo al servidor de Discord donde funcionará. Para esto, se debe pedir a un administrador que acepte la solicitud del bot para ingresar. Por lo tanto, es necesario que el bot que creamos sea "Público". De otra manera, nadie podrá unirlo a su servidor de Discord; los bots privados solo los puede unir su creador y solamente a aquellos servidores de los que sea dueño.

![Estableciendo el bot como Público](docs/public-bot.jpg?raw=true "Estableciendo el bot como Público")

Luego se debe compartir este link con el administrador del servidor al cual queremos que el bot se una:

```text
https://discordapp.com/oauth2/authorize?&client_id=CLIENT_ID_HERE&scope=bot&permissions=268438528
```

El `CLIENT_ID` fue generado durante la creación de la app ([ver Prerrequisitos](#prerrequisitos)). El número utilizado en el parámetro `permissions` corresponde a los permisos que el bot necesita para funcionar correctamente.

La lista de permisos está disponible en la página de administración del bot:

![Permisos en Discord](docs/permissions.png?raw=true "Permisos en Discord")

### Roles

En la configuración del servidor, es necesario asegurarse de que el bot tenga la mayor autoridad posible en materia de roles. Y, sobre todo, es importante que el bot esté por encima de los roles que pretende asignar.

Por ejemplo, esta configuración no funcionará, dado que `[Test Levin App]` no va a poder remover o asignar los roles NVL1, NVL2 y NVL3.

![Mala configuración de roles](docs/wrong-setup.jpg?raw=true "Mala configuración de roles")

Es necesario que la configuración luzca similar a esto:

![Configuración correcta de roles](docs/correct-setup.jpg?raw=true "Configuración correcta de roles")

### Permisos de lectura

Además, es indispensable que el bot tenga acceso de lectura a la mayor cantidad de canales posibles. No es necesario que tenga acceso a todos, pero la subida de nivel automática se hace sobre la base de los mensajes que el bot pueda leer de los usuarios. Si un usuario es muy activo solo en un canal determinado y el bot no puede leer los mensajes allí, eventualmente el bot bajará de nivel a este miembro.

Algo así debería lucir la configuración de cualquier canal al que se quiera que Levin tenga acceso:

![Configuración correcta de un canal](docs/exampleChannel.png?raw=true "Configuración correcta de un canal")

### Canal donde publicar los leveleos

Se debe crear un canal donde Levin pueda publicar las actualizaciones de nivel de los usuarios. Levin utilizará este canal para avisar a quienes tengan acceso de lectura a dicho canal sobre los cambios de nivel que va realizando.

![Configuración correcta de canal de leveleos](docs/updatesChannel.png?raw=true "Configuración correcta de canal de leveleos")

## Iniciando el bot

```bash
LEVIN_TOKEN=<bot-token> DB_BACKUP_INTERVAL_IN_MINUTES=2 LEVEL_CHECK_INTERVAL_IN_MINUTES=1440 DB_REPOSITORY=<db_repository> ENV=<dev|stage|prod> GITHUB_TOKEN=<github-token> UPDATES_CHANNEL=<nombre-del-canal> npm start
```

Si todo está correctamente instalado, aparecerá un mensaje indicando que Levin se conectó a Discord.

## Variables de entorno

| Variable | Requerida | Descripción | Ejemplo / Notas |
| --- | --- | --- | --- |
| `LEVIN_TOKEN` | Sí | Token del bot de Discord usado para iniciar sesión. | Se obtiene desde el portal de desarrolladores de Discord. Debe mantenerse secreto. |
| `GITHUB_TOKEN` | Sí | Token de GitHub de un usuario con acceso al repositorio que guarda los archivos de la base de datos. | Debe tratarse como una contraseña. |
| `DB_REPOSITORY` | Sí | Repositorio donde viven `dev-db.json`, `stage-db.json` y `prod-db.json`. | Formato: `owner/repo` |
| `ENV` | Sí | Define qué archivo de base de datos usa Levin. | Valores válidos: `dev`, `stage`, `prod` |
| `DB_BACKUP_INTERVAL_IN_MINUTES` | Sí | Intervalo usado para persistir la base de datos de nuevo en GitHub. | Debe ser mayor a `0` y menor o igual a `1440` |
| `LEVEL_CHECK_INTERVAL_IN_MINUTES` | Sí | Intervalo usado para ejecutar los chequeos automáticos de nivel. | Debe ser mayor a `0` y menor o igual a `1440` |
| `UPDATES_CHANNEL` | No | Nombre del canal donde Levin publica los cambios de nivel. | Debe coincidir exactamente con el nombre del canal en Discord |

Estas son todas las variables de entorno de runtime que actualmente lee el código de la aplicación.

## Deployment

Cualquier servidor que pueda ejecutar aplicaciones Node.js puede correr perfectamente Levin. Con el mismo comando que se utiliza localmente alcanza, ya que la app no requiere ningún paso de build.

## Recursos

- Lista de eventos disponibles: https://gist.github.com/koad/316b265a91d933fd1b62dddfcc3ff584
- Idem: https://github.com/onepiecehung/discordjs-logger
- Documentación general de DiscordJS (API usada en la comunicación con Discord): https://discordjs.guide/#before-you-begin
- DiscordJS API: https://discord.js.org/#/docs/main/stable/general/welcome
- Octokit (GitHub API): https://octokit.github.io/rest.js/v18
- Guía general de TypeScript: https://www.typescriptlang.org/docs/home.html

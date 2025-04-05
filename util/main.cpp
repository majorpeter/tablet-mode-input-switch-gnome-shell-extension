#include <unistd.h>
#include <cstdlib>
#include <iostream>
#include <format>
#include <fstream>
#include <filesystem>

#include <cstring>

#include "config.h"

enum class OnOffCmd : int
{
    On = 0,
    Off = 1
};

struct Args
{
    bool testmode{false};
    std::optional<OnOffCmd> onOff{};
};

static constexpr char kFlagTestMode[] = "--test";
static constexpr char kFlagTestModeShort[] = "-t";
static constexpr char kOn[] = "on";
static constexpr char kOff[] = "off";

static constexpr char fmtDeviceNamePath[] = "/sys/class/input/event{}/device/name";
static constexpr char fmtInhibitPath[] = "/sys/class/input/event{}/device/inhibited";

static void printUsage(const char *name)
{
    std::cerr << "Usage: " << name << " [" << kFlagTestMode << '|' << kFlagTestModeShort << "] [" << kOn << "|" << kOff << "]" << std::endl;
}

static Args parseArgs(int argc, char **argv)
{
    if (argc < 1)
    {
        printUsage("?");
        exit(1);
    }

    Args args;
    for (int i = 1; i < argc; i++)
    {
        // test flags
        if (argv[i][0] == '-')
        {
            if ((strcmp(argv[i], kFlagTestMode) == 0) || (strcmp(kFlagTestModeShort, argv[i]) == 0))
            {
                args.testmode = true;
            }
            else
            {
                std::cerr << "Unsupported flag: " << argv[i] << std::endl;
                printUsage(argv[0]);
                exit(1);
            }
        }
        else
        {
            if (strcmp(argv[i], kOn) == 0)
            {
                args.onOff = OnOffCmd::On;
            }
            else if (strcmp(argv[i], kOff) == 0)
            {
                args.onOff = OnOffCmd::Off;
            }
            else
            {
                std::cerr << "Unsupperted positional argument: " << argv[i] << std::endl;
                printUsage(argv[0]);
                exit(1);
            }
        }
    }

    return args;
}

static int setDevicesEnabled(OnOffCmd cmd)
{
    int result = 0;

    static const std::filesystem::path sysClassInput{"/sys/class/input/"};
    for (auto i : std::filesystem::directory_iterator{sysClassInput})
    {
        const auto basename = i.path().stem().string();
        if (basename.starts_with("event"))
        {
            const auto eventNumber = atoi(basename.c_str() + sizeof("event") - 1);
            std::ifstream f(std::format(fmtDeviceNamePath, eventNumber));
            std::string deviceName;
            std::getline(f, deviceName);

            if (std::find_if(deviceNames.cbegin(), deviceNames.cend(),
                             [&deviceName](const std::string_view &e) -> bool
                             {
                                 return !e.compare(deviceName);
                             }) != deviceNames.cend())
            {
                std::ofstream f(std::format(fmtInhibitPath, eventNumber), std::ios::out);
                f << static_cast<int>(cmd);
                result++;

                std::cout << "Found " << deviceName << " at event" << eventNumber << ", set to " << static_cast<int>(cmd) << std::endl;
            }
        }
    }

    return result;
}

int main(int argc, char **argv)
{
    const auto args = parseArgs(argc, argv);
    if (!args.testmode && !args.onOff.has_value())
    {
        printUsage(argv[0]);
        return 1;
    }

    if (setuid(0) < 0)
    {
        std::cerr << "cannot change to root!" << std::endl;
        return 1;
    }

    if (!args.testmode)
    {
        const auto result = setDevicesEnabled(*args.onOff);
        if (result != deviceNames.size())
        {
            std::cerr << "Could not inhibit all devices, got " << result << ", exprected " << deviceNames.size();
            return 2;
        }

        return 0;
    }
    else
    {
        auto result = setDevicesEnabled(OnOffCmd::Off);
        if (result != deviceNames.size())
        {
            std::cerr << "Could not inhibit all devices, got " << result << ", exprected " << deviceNames.size();
        }

        std::cout << "Waiting..." << std::endl;
        sleep(10);

        result = setDevicesEnabled(OnOffCmd::On);
        if (result != deviceNames.size())
        {
            std::cerr << "Could not inhibit all devices, got " << result << ", exprected " << deviceNames.size();
        }

        return 0;
    }
}

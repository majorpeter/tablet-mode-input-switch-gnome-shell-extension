#include <unistd.h>
#include <cstdlib>
#include <iostream>
#include <format>
#include <fstream>
#include <filesystem>

#include "config.h"

static constexpr char deviceNamePathFmt[] = "/sys/class/input/event{}/device/name";
static constexpr char inhibitPathFmt[] = "/sys/class/input/event{}/device/inhibited";

int main(int argc, char **argv)
{
    if (argc < 2)
    {
        std::cerr << "argument missing" << std::endl;
        return 1;
    }
    const int value = atoi(argv[1]);
    switch (value)
    {
    case 0:
    case 1:
        break;
    default:
        std::cerr << "invalid argument, expected: 0|1, got: " << argv[1] << std::endl;
        return 1;
    }

    if (setuid(0) < 0)
    {
        std::cerr << "cannot change to root!" << std::endl;
        return 1;
    }

    static const std::filesystem::path sysClassInput{"/sys/class/input/"};
    for (auto i : std::filesystem::directory_iterator{sysClassInput})
    {
        const auto basename = i.path().stem().string();
        if (basename.starts_with("event"))
        {
            const auto eventNumber = atoi(basename.c_str() + sizeof("event") - 1);
            std::ifstream f(std::format(deviceNamePathFmt, eventNumber));
            std::string deviceName;
            std::getline(f, deviceName);

            if (std::find_if(deviceNames.cbegin(), deviceNames.cend(),
                             [&deviceName](const std::string_view &e) -> bool
                             {
                                 return !e.compare(deviceName);
                             }) != deviceNames.cend())
            {
                std::ofstream f(std::format(inhibitPathFmt, eventNumber), std::ios::out);
                f << value;

                std::cout << "Found " << deviceName << " at event" << eventNumber << ", set to " << value << std::endl;
            }
        }
    }

    return 0;
}
